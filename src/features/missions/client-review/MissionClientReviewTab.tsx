import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { Badge } from '../../../components/ui/Badge'
import { useReviewAssessments } from '../useReviewAssessments'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ASSESSMENT_STATUS_CONFIG } from '../mission-constants'
import type { MissionDetail } from '../useMissionDetail'

interface MissionClientReviewTabProps {
  mission: MissionDetail
}

export function MissionClientReviewTab({ mission }: MissionClientReviewTabProps){
  const { assessments, loading, error, refetch } = useReviewAssessments(mission.id)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState(false)

  const approvedInternally = assessments.filter((a) => a.status === 'approved')
  const handleSendToClient = useCallback(async () => {
    setSending(true)
    setSendError(null)
    setSendSuccess(false)
    const { data, error: fnError } = await supabase.functions.invoke('send-to-client-review', {
      body: { mission_id: mission.id },
    })
    if (fnError || data?.error) {
      setSendError(fnError?.message ?? data?.error ?? 'Erreur.')
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
    return <EmptyState title="Aucun contr&ocirc;le soumis" description="Les travaux doivent d&apos;abord &ecirc;tre valid&eacute;s en interne." />
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-gray-900">Validation client</h3>
        <p className="text-[13px] text-gray-500 mt-0.5">Envoyez les contr&ocirc;les approuv&eacute;s au client pour validation finale.</p>
      </div>

      {sendError && <ErrorAlert message={sendError} />}
      {sendSuccess && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">Contr&ocirc;les envoy&eacute;s au client.</div>}

      {approvedInternally.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-forest-50 border border-forest-300 rounded-xl">
          <p className="text-sm text-forest-900 font-medium">
            <span className="text-2xl font-bold text-forest-700 mr-2">{approvedInternally.length}</span>
            contr&ocirc;le{approvedInternally.length > 1 ? 's' : ''} approuv&eacute;{approvedInternally.length > 1 ? 's' : ''} en interne
          </p>
          <button onClick={handleSendToClient} disabled={sending}
            className="bg-forest-700 text-white px-5 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors flex items-center gap-1.5">
            &#9993; {sending ? 'Envoi...' : 'Envoyer au client'}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Contr&ocirc;le</th>
              <th className="px-4 py-3">Auditeur</th>
              <th className="px-4 py-3">Statut interne</th>
              <th className="px-4 py-3">Statut client</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((a) => {
              const st = ASSESSMENT_STATUS_CONFIG[a.status]
              const clientVal = a.validations.find((v) => v.stage === 'client_review')
              return (
                <tr key={a.id} className="border-t border-gray-50 hover:bg-forest-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-medium text-forest-700">{a.control.code}</span>
                    <span className="ml-2 text-[13px] text-gray-900">{a.control.name}</span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-gray-600">{a.auditor.first_name} {a.auditor.last_name}</td>
                  <td className="px-4 py-3"><Badge label={st.label} variant={st.variant} /></td>
                  <td className="px-4 py-3">
                    {clientVal ? (
                      <Badge label={clientVal.decision === 'approved' ? 'Valid\u00e9' : 'Rejet\u00e9'} variant={clientVal.decision === 'approved' ? 'green' : 'red'} />
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
