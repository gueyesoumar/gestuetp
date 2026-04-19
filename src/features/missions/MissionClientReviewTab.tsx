import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useReviewAssessments } from './useReviewAssessments'
import { Badge } from '../../components/ui/Badge'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { EmptyState } from '../../components/ui/EmptyState'
import type { MissionDetail } from './useMissionDetail'
import type { AssessmentStatus } from '../../types/database.types'

interface MissionClientReviewTabProps {
  mission: MissionDetail
}

const statusConfig: Record<AssessmentStatus, { label: string; variant: 'gray' | 'blue' | 'green' | 'red' }> = {
  draft: { label: 'Brouillon', variant: 'gray' },
  submitted: { label: 'Soumis', variant: 'blue' },
  in_review: { label: 'En revue client', variant: 'blue' },
  approved: { label: 'Valid\u00e9 client', variant: 'green' },
  rejected: { label: 'Rejet\u00e9 client', variant: 'red' },
}

export function MissionClientReviewTab({ mission }: MissionClientReviewTabProps) {
  const { assessments, loading, error, refetch } = useReviewAssessments(mission.id)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState(false)

  const approvedInternally = assessments.filter((a) => a.status === 'approved')
  const inClientReview = assessments.filter((a) => a.status === 'in_review')
  const rejectedByClient = assessments.filter((a) =>
    a.status === 'draft' && a.validations.some((v) => v.stage === 'client_review' && v.decision === 'rejected')
  )

  const handleSendToClient = useCallback(async () => {
    setSending(true)
    setSendError(null)
    setSendSuccess(false)

    const { data, error: fnError } = await supabase.functions.invoke('send-to-client-review', {
      body: { mission_id: mission.id },
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
      setSendError(detail)
      setSending(false)
      return
    }

    if (data?.error) {
      setSendError(data.error)
      setSending(false)
      return
    }

    setSendSuccess(true)
    setSending(false)
    refetch()
  }, [mission.id, refetch])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  if (assessments.length === 0) {
    return (
      <EmptyState
        title="Aucun contr&ocirc;le soumis"
        description="Les travaux doivent d&apos;abord &ecirc;tre valid&eacute;s en interne."
      />
    )
  }

  const clientApprovedCount = assessments.filter((a) =>
    a.status === 'approved' && a.validations.some((v) => v.stage === 'client_review' && v.decision === 'approved')
  ).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Validation client</h3>
          <p className="text-sm text-gray-600">
            Envoyez les contr&ocirc;les approuv&eacute;s au client pour validation finale.
          </p>
        </div>
        <div className="flex gap-2">
          {approvedInternally.length > 0 && <Badge label={`${approvedInternally.length} pr&ecirc;ts`} variant="green" />}
          {inClientReview.length > 0 && <Badge label={`${inClientReview.length} en revue`} variant="blue" />}
          {clientApprovedCount > 0 && <Badge label={`${clientApprovedCount} valid&eacute;s`} variant="green" />}
          {rejectedByClient.length > 0 && <Badge label={`${rejectedByClient.length} rejet&eacute;s`} variant="red" />}
        </div>
      </div>

      {sendError && <ErrorAlert message={sendError} />}
      {sendSuccess && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Contr&ocirc;les envoy&eacute;s au client pour validation.
        </div>
      )}

      {approvedInternally.length > 0 && (
        <div className="rounded-lg border border-gold-200 bg-forest-50 p-4 flex items-center justify-between">
          <span className="text-sm text-forest-900">
            {approvedInternally.length} contr&ocirc;le{approvedInternally.length > 1 ? 's' : ''} approuv&eacute;{approvedInternally.length > 1 ? 's' : ''} en interne, pr&ecirc;t{approvedInternally.length > 1 ? 's' : ''} pour le client.
          </span>
          <button
            onClick={handleSendToClient}
            disabled={sending}
            className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-900 disabled:opacity-50"
          >
            {sending ? 'Envoi...' : 'Envoyer au client'}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Contr&ocirc;le</th>
              <th className="px-4 py-3">Auditeur</th>
              <th className="px-4 py-3">Statut interne</th>
              <th className="px-4 py-3">Statut client</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((a) => {
              const st = statusConfig[a.status]
              const clientValidation = a.validations.find((v) => v.stage === 'client_review')
              return (
                <tr key={a.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-forest-700">{a.control.code}</span>
                    <span className="ml-2 text-sm text-gray-900">{a.control.name}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {a.auditor.first_name} {a.auditor.last_name}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={st.label} variant={st.variant} />
                  </td>
                  <td className="px-4 py-3">
                    {clientValidation ? (
                      <Badge
                        label={clientValidation.decision === 'approved' ? 'Valid\u00e9' : 'Rejet\u00e9'}
                        variant={clientValidation.decision === 'approved' ? 'green' : 'red'}
                      />
                    ) : (
                      <Badge label="En attente" variant="gray" />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
