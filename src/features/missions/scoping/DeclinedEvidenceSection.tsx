import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Check, RotateCw, FileWarning, ChevronRight } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { useToast } from '../../../hooks/useToast'
import { useMissionEvidenceRequests } from '../useMissionEvidenceRequests'
import type {
  MissionEvidenceRequest,
  EvidenceDeclineReason,
  EvidenceRequestStatus,
} from '../../../types/database.types'

interface DeclinedEvidenceSectionProps {
  missionId: string
}

interface EnrichedRequest extends MissionEvidenceRequest {
  evidenceName: string
  controlCode: string
  controlId: string
  declinerName: string | null
  decidedByName: string | null
}

const REASON_LABEL: Record<EvidenceDeclineReason, string> = {
  inexistant: 'Inexistant',
  non_applicable: 'Non applicable',
  confidentialite: 'Confidentialité',
}

const REASON_TONE: Record<EvidenceDeclineReason, string> = {
  inexistant: 'bg-red-50 text-red-700 border-red-200',
  non_applicable: 'bg-amber-50 text-amber-700 border-amber-200',
  confidentialite: 'bg-blue-50 text-blue-700 border-blue-200',
}

const STATUS_LABEL: Record<EvidenceRequestStatus, string> = {
  pending: 'En attente',
  uploaded: 'Reçu',
  declined_by_client: 'Déclaré ND',
  accepted: 'Accepté',
  reissued: 'Réémis',
  escalated_to_finding: 'Constat créé',
}

export function DeclinedEvidenceSection({ missionId }: DeclinedEvidenceSectionProps): JSX.Element | null {
  const navigate = useNavigate()
  const toast = useToast()
  const { requests, respondToDecline, responding, refetch } = useMissionEvidenceRequests(missionId)
  const [enriched, setEnriched] = useState<EnrichedRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  // Filtrer les requêtes non terminales / pertinentes pour cette section
  const declinedRequests = useMemo(
    () => requests.filter((r) => r.status === 'declined_by_client'),
    [requests],
  )
  const recentlyResolved = useMemo(
    () => requests
      .filter((r) =>
        (r.status === 'accepted' || r.status === 'reissued' || r.status === 'escalated_to_finding')
        && r.declined_at != null,
      )
      .sort((a, b) => (b.auditor_decided_at ?? '').localeCompare(a.auditor_decided_at ?? ''))
      .slice(0, 3),
    [requests],
  )

  const allToShow = useMemo(() => [...declinedRequests, ...recentlyResolved], [declinedRequests, recentlyResolved])

  // Enrichir avec evidence_catalog (name, control_id) + control.code + users names
  useEffect(() => {
    if (allToShow.length === 0) { setEnriched([]); return }
    const ctrl = new AbortController()
    const fetchMeta = async (): Promise<void> => {
      setLoading(true)
      const evidenceCatalogIds = [...new Set(allToShow.map((r) => r.evidence_catalog_id))]
      const userIds = [
        ...new Set(allToShow.flatMap((r) => [r.declined_by, r.auditor_decided_by]).filter((id): id is string => !!id)),
      ]

      const { data: catalogRows } = await supabase
        .from('evidence_catalog')
        .select('id, name, control_id')
        .in('id', evidenceCatalogIds)
        .abortSignal(ctrl.signal)
      if (ctrl.signal.aborted) return
      const catalogMap = new Map((catalogRows ?? []).map((c) => [c.id, c]))

      const controlIds = [...new Set((catalogRows ?? []).map((c) => c.control_id))]
      const { data: controlRows } = await supabase
        .from('controls')
        .select('id, code')
        .in('id', controlIds)
        .abortSignal(ctrl.signal)
      if (ctrl.signal.aborted) return
      const controlMap = new Map((controlRows ?? []).map((c) => [c.id, c.code]))

      let userMap = new Map<string, string>()
      if (userIds.length > 0) {
        const { data: userRows } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', userIds)
          .abortSignal(ctrl.signal)
        if (ctrl.signal.aborted) return
        userMap = new Map((userRows ?? []).map((u) => [u.id, `${u.first_name} ${u.last_name}`]))
      }

      const out: EnrichedRequest[] = allToShow.map((r) => {
        const cat = catalogMap.get(r.evidence_catalog_id)
        return {
          ...r,
          evidenceName: cat?.name ?? '—',
          controlId: cat?.control_id ?? '',
          controlCode: cat?.control_id ? (controlMap.get(cat.control_id) ?? '—') : '—',
          declinerName: r.declined_by ? userMap.get(r.declined_by) ?? null : null,
          decidedByName: r.auditor_decided_by ? userMap.get(r.auditor_decided_by) ?? null : null,
        }
      })
      setEnriched(out)
      setLoading(false)
    }
    fetchMeta()
    return () => ctrl.abort()
  }, [allToShow])

  const closePanel = (): void => {
    setActiveId(null)
    setResponseText('')
    setActionError(null)
  }

  const decide = async (id: string, action: 'accept' | 'reissue' | 'escalate'): Promise<void> => {
    setActionError(null)
    if (action === 'reissue' && responseText.trim().length === 0) {
      setActionError('Un commentaire est obligatoire pour réémettre.')
      return
    }
    const result = await respondToDecline({
      evidence_request_id: id,
      action,
      response_text: responseText.trim() || undefined,
    })
    if (!result.ok) { setActionError(result.error ?? 'Erreur'); return }
    if (action === 'escalate' && result.assessment_id) {
      toast.success('Constat NC pré-rempli. Vous pouvez le réviser dans l’onglet Travaux.')
    } else if (action === 'accept') {
      toast.success('Déclaration acceptée.')
    } else {
      toast.success('Demande réémise au client.')
    }
    closePanel()
    refetch()
  }

  if (declinedRequests.length === 0 && recentlyResolved.length === 0) return null

  return (
    <div className="bg-white border border-amber-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
        <FileWarning size={14} className="text-amber-700" />
        <span className="text-[13px] font-semibold text-amber-900">Documents d&eacute;clar&eacute;s non disponibles</span>
        {declinedRequests.length > 0 && (
          <span className="ml-auto text-[10px] font-bold text-white bg-amber-600 px-2 py-0.5 rounded-full">
            {declinedRequests.length} {declinedRequests.length > 1 ? 'décisions requises' : 'décision requise'}
          </span>
        )}
      </div>

      <div>
        {loading && enriched.length === 0 && (
          <p className="px-5 py-4 text-[12px] text-gray-400">Chargement&hellip;</p>
        )}
        {enriched.map((r) => {
          const isOpen = activeId === r.id
          const isAwaiting = r.status === 'declined_by_client'
          return (
            <div key={r.id} className={`border-b border-gray-100 last:border-b-0 ${isAwaiting ? '' : 'opacity-60'}`}>
              <div className={`px-5 py-3 ${isOpen ? 'bg-amber-50/30' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-gray-900">{r.evidenceName}</span>
                      <span className="font-mono text-[9px] font-semibold bg-forest-50 text-forest-700 px-1.5 py-0.5 rounded">{r.controlCode}</span>
                      {r.decline_reason && (
                        <span className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full border ${REASON_TONE[r.decline_reason]}`}>
                          {REASON_LABEL[r.decline_reason]}
                        </span>
                      )}
                      {!isAwaiting && (
                        <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {STATUS_LABEL[r.status]}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 text-[11px] text-gray-500 flex items-center gap-2 flex-wrap">
                      {r.declinerName && <span>D&eacute;clar&eacute; par <strong className="text-gray-700">{r.declinerName}</strong></span>}
                      {r.declined_at && <span>&middot; {formatRelative(r.declined_at)}</span>}
                    </div>
                    {r.decline_justification && (
                      <p className="mt-2 text-[12px] text-gray-700 italic leading-relaxed">&laquo;&nbsp;{r.decline_justification}&nbsp;&raquo;</p>
                    )}
                    {!isAwaiting && r.auditor_response && (
                      <p className="mt-2 text-[11.5px] text-gray-500">
                        <span className="font-semibold text-gray-600">R&eacute;ponse auditeur&nbsp;:</span> {r.auditor_response}
                      </p>
                    )}
                    {r.status === 'escalated_to_finding' && r.escalated_assessment_id && (
                      <button
                        onClick={() => navigate(`/missions/${missionId}?tab=fieldwork&assessment=${r.escalated_assessment_id}`)}
                        className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-forest-700 hover:text-forest-900"
                      >
                        Voir le constat <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                  {isAwaiting && (
                    <button
                      onClick={() => isOpen ? closePanel() : (setActiveId(r.id), setResponseText(''), setActionError(null))}
                      className="text-[11px] font-semibold text-amber-700 border border-amber-300 px-3 py-1 rounded-lg hover:bg-amber-50"
                    >
                      {isOpen ? 'Fermer' : 'Décider'}
                    </button>
                  )}
                </div>

                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                    {actionError && <ErrorAlert message={actionError} />}
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                      Commentaire <span className="text-gray-400 normal-case font-normal">(obligatoire pour r&eacute;&eacute;mettre)</span>
                    </label>
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      rows={2}
                      placeholder="Optionnel pour Accepter / Transformer en constat. Obligatoire pour Réémettre&hellip;"
                      disabled={responding}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[12px] outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 resize-y"
                    />
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        onClick={() => decide(r.id, 'accept')}
                        disabled={responding}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-[11.5px] font-semibold hover:bg-green-700 disabled:opacity-50"
                      >
                        <Check size={12} /> Accepter la d&eacute;claration
                      </button>
                      <button
                        onClick={() => decide(r.id, 'reissue')}
                        disabled={responding}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-[11.5px] font-semibold hover:bg-gray-50 disabled:opacity-50"
                      >
                        <RotateCw size={12} /> Insister / r&eacute;&eacute;mettre
                      </button>
                      <button
                        onClick={() => decide(r.id, 'escalate')}
                        disabled={responding}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-[11.5px] font-semibold hover:bg-red-700 disabled:opacity-50"
                      >
                        <AlertCircle size={12} /> Transformer en constat
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'aujourd’hui'
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} jours`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
