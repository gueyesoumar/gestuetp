import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuditorAssessments } from './useAuditorAssessments'
import { AssessmentWorkForm } from './AssessmentWorkForm'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { EmptyState } from '../../components/ui/EmptyState'
import { Badge } from '../../components/ui/Badge'

interface MissionFieldworkTabProps {
  missionId: string
}

export function MissionFieldworkTab({ missionId }: MissionFieldworkTabProps) {
  const { assessments, loading, error, refetch } = useAuditorAssessments(missionId)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = useCallback(async (id: string, data: { findings: string; recommendations: string }): Promise<boolean> => {
    setSaving(true)
    setSaveError(null)

    const { error: updateError } = await supabase
      .from('control_assessments')
      .update({
        findings: data.findings || null,
        recommendations: data.recommendations || null,
      })
      .eq('id', id)

    if (updateError) {
      console.error('save assessment:', updateError.message)
      setSaveError('Erreur lors de l\u2019enregistrement.')
      setSaving(false)
      return false
    }

    setSaving(false)
    return true
  }, [])

  const handleSubmit = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true)
    setSaveError(null)

    const { data, error: fnError } = await supabase.functions.invoke('submit-assessment', {
      body: { assessment_id: id },
    })

    if (fnError) {
      let detail = fnError.message
      try {
        const context = (fnError as unknown as { context: { json: () => Promise<{ error?: string }> } }).context
        if (context?.json) {
          const body = await context.json()
          if (body?.error) detail = body.error
        }
      } catch { /* */ }
      setSaveError(detail)
      setSaving(false)
      return false
    }

    if (data?.error) {
      setSaveError(data.error)
      setSaving(false)
      return false
    }

    setSaving(false)
    refetch()
    return true
  }, [refetch])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  if (assessments.length === 0) {
    return (
      <EmptyState
        title="Aucun contr&ocirc;le affect&eacute;"
        description="Les contr&ocirc;les vous seront affect&eacute;s par le chef de mission dans l&apos;onglet Planification."
      />
    )
  }

  const draftCount = assessments.filter((a) => a.status === 'draft').length
  const submittedCount = assessments.filter((a) => a.status === 'submitted' || a.status === 'in_review').length
  const approvedCount = assessments.filter((a) => a.status === 'approved').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Travaux sur le terrain</h3>
          <p className="text-sm text-gray-600">
            R&eacute;digez vos constats et recommandations pour chaque contr&ocirc;le.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge label={`${draftCount} brouillons`} variant="gray" />
          <Badge label={`${submittedCount} soumis`} variant="blue" />
          <Badge label={`${approvedCount} approuv\u00e9s`} variant="green" />
        </div>
      </div>

      {saveError && <ErrorAlert message={saveError} />}

      <div className="space-y-4">
        {assessments.map((assessment) => (
          <AssessmentWorkForm
            key={assessment.id}
            assessment={assessment}
            onSave={handleSave}
            onSubmit={handleSubmit}
            saving={saving}
          />
        ))}
      </div>
    </div>
  )
}
