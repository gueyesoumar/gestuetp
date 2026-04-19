import { useState } from 'react'
import type { FormEvent } from 'react'
import { Badge } from '../../components/ui/Badge'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { MissionStatusBadge } from './MissionStatusBadge'
import type { AssessmentWithControl } from './useAuditorAssessments'
import type { AssessmentStatus } from '../../types/database.types'

interface AssessmentWorkFormProps {
  assessment: AssessmentWithControl
  onSave: (id: string, data: { findings: string; recommendations: string }) => Promise<boolean>
  onSubmit: (id: string) => Promise<boolean>
  saving: boolean
}

const statusLabels: Record<AssessmentStatus, { label: string; variant: 'gray' | 'blue' | 'green' | 'red' }> = {
  draft: { label: 'Brouillon', variant: 'gray' },
  submitted: { label: 'Soumis', variant: 'blue' },
  in_review: { label: 'En revue', variant: 'blue' },
  approved: { label: 'Approuv\u00e9', variant: 'green' },
  rejected: { label: 'Rejet\u00e9', variant: 'red' },
}

export function AssessmentWorkForm({ assessment, onSave, onSubmit, saving }: AssessmentWorkFormProps) {
  const [findings, setFindings] = useState(assessment.findings ?? '')
  const [recommendations, setRecommendations] = useState(assessment.recommendations ?? '')
  const [success, setSuccess] = useState(false)

  const canEdit = assessment.status === 'draft' || assessment.status === 'rejected'
  const canSubmit = canEdit && findings.trim().length > 0
  const status = statusLabels[assessment.status]

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSuccess(false)
    const ok = await onSave(assessment.id, { findings, recommendations })
    if (ok) setSuccess(true)
  }

  const handleSubmit = async () => {
    setSuccess(false)
    await onSubmit(assessment.id)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold text-forest-700">
              {assessment.control.domain.code} &mdash; {assessment.control.code}
            </span>
            <Badge label={status.label} variant={status.variant} />
          </div>
          <h4 className="mt-1 text-sm font-medium text-gray-900">{assessment.control.name}</h4>
        </div>
      </div>

      <form onSubmit={handleSave} className="px-5 py-4 space-y-4">
        {success && (
          <div className="rounded-md bg-green-50 p-2 text-sm text-green-700">
            Travaux enregistr&eacute;s.
          </div>
        )}

        {assessment.control.description && (
          <div className="rounded bg-gray-50 p-3 text-sm text-gray-600">
            <span className="font-medium">Description du contr&ocirc;le :</span> {assessment.control.description}
          </div>
        )}

        {assessment.ai_draft && (
          <div className="rounded border border-purple-200 bg-purple-50 p-3 text-sm text-purple-800">
            <span className="font-medium">Suggestion IA :</span> {assessment.ai_draft}
          </div>
        )}

        <div>
          <label htmlFor={`findings-${assessment.id}`} className="block text-sm font-medium text-gray-700">
            Constats
          </label>
          <textarea
            id={`findings-${assessment.id}`}
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            rows={4}
            disabled={!canEdit || saving}
            placeholder="D&eacute;crivez vos observations et constats..."
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 disabled:bg-gray-50"
          />
        </div>

        <div>
          <label htmlFor={`reco-${assessment.id}`} className="block text-sm font-medium text-gray-700">
            Recommandations
          </label>
          <textarea
            id={`reco-${assessment.id}`}
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            rows={3}
            disabled={!canEdit || saving}
            placeholder="Proposez des recommandations d&apos;am&eacute;lioration..."
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 disabled:bg-gray-50"
          />
        </div>

        {canEdit && (
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-[13px] text-gray-600 hover:bg-forest-50 hover:border-forest-300 transition-colors disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer le brouillon'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !canSubmit}
              className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-forest-900 disabled:opacity-50"
            >
              Soumettre au chef de mission
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
