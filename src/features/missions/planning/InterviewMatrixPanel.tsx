import { useState, useMemo } from 'react'
import { X, Sparkles, Check, AlertTriangle, Users, Loader2 } from 'lucide-react'
import { generateFromMatrix, computeMatrixCoverage, type MatrixCell } from './generateFromMatrix'
import type { ClientContact } from '../../../types/database.types'
import type { AuditTopicWithControls } from './useAuditTopics'
import type { MissionMemberRow } from '../useMissionDetail'

interface InterviewMatrixPanelProps {
  missionId: string
  startDate: string | null
  endDate: string | null
  actors: ClientContact[]
  topics: AuditTopicWithControls[]
  members: MissionMemberRow[]
  controlIdToCode: Map<string, string>
  onGenerate: (specs: ReturnType<typeof generateFromMatrix>) => Promise<void>
  onClose: () => void
  generating: boolean
}

export function InterviewMatrixPanel({
  missionId, startDate, endDate, actors, topics, members, controlIdToCode,
  onGenerate, onClose, generating,
}: InterviewMatrixPanelProps) {
  // Sujets actifs dans la matrice (par defaut tous coches)
  const [activeTopicIds, setActiveTopicIds] = useState<Set<string>>(new Set(topics.map((t) => t.id)))
  const [cells, setCells] = useState<Set<string>>(new Set())
  const auditorMembers = members.filter((m) => m.role === 'auditor' || m.role === 'lead_auditor')
  const lead = members.find((m) => m.role === 'lead_auditor')
  const [auditorId, setAuditorId] = useState<string>(lead?.user_id ?? auditorMembers[0]?.user_id ?? '')

  const cellKey = (actorId: string, topicId: string): string => `${actorId}::${topicId}`

  const toggleCell = (actorId: string, topicId: string): void => {
    setCells((prev) => {
      const next = new Set(prev)
      const key = cellKey(actorId, topicId)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const toggleTopic = (topicId: string): void => {
    setActiveTopicIds((prev) => {
      const next = new Set(prev)
      if (next.has(topicId)) {
        next.delete(topicId)
        // nettoyer les cellules de cette colonne
        setCells((cprev) => {
          const cnext = new Set(cprev)
          for (const k of cnext) if (k.endsWith(`::${topicId}`)) cnext.delete(k)
          return cnext
        })
      } else {
        next.add(topicId)
      }
      return next
    })
  }

  const activeTopics = useMemo(
    () => topics.filter((t) => activeTopicIds.has(t.id)),
    [topics, activeTopicIds]
  )

  const cellList = useMemo<MatrixCell[]>(() => {
    const list: MatrixCell[] = []
    for (const k of cells) {
      const [actorId, topicId] = k.split('::')
      if (actorId && topicId) list.push({ actorId, topicId })
    }
    return list
  }, [cells])

  const coverage = useMemo(
    () => computeMatrixCoverage([...activeTopicIds], cellList),
    [activeTopicIds, cellList]
  )

  const previewSpecs = useMemo(
    () => generateFromMatrix(missionId, actors, topics, cellList, auditorId, startDate, endDate, controlIdToCode),
    [missionId, actors, topics, cellList, auditorId, startDate, endDate, controlIdToCode]
  )

  const canGenerate = previewSpecs.length > 0 && auditorId.length > 0 && !generating

  const handleGenerate = async (): Promise<void> => {
    if (!canGenerate) return
    await onGenerate(previewSpecs)
  }

  const fullCoverage = coverage.uncoveredTopicIds.length === 0 && activeTopicIds.size > 0
  const topicNameById = new Map(topics.map((t) => [t.id, t.name]))

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-gray-200 bg-forest-50 flex items-center gap-3">
          <Users size={16} className="text-forest-700" />
          <div className="flex-1">
            <p className="text-[14px] font-bold text-forest-900">Matrice acteurs × sujets</p>
            <p className="text-[11px] text-forest-700 mt-0.5">
              Cochez les cellules pour assigner un sujet à un acteur. Un entretien sera créé par acteur ayant au moins une cellule cochée.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        {/* Selection des sujets a inclure dans la matrice */}
        <div className="px-5 py-2.5 border-b border-gray-200 bg-[#FAFAFA]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
              Sujets pris en compte ({activeTopicIds.size}/{topics.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((t) => {
              const on = activeTopicIds.has(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTopic(t.id)}
                  className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                    on
                      ? 'bg-gold-50 text-gold-700 border-gold-300'
                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {on && <span className="mr-1">✓</span>}
                  {t.name}
                  <span className="ml-1 text-[9px] opacity-70">({t.control_ids.length})</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Matrice */}
        <div className="flex-1 overflow-auto p-4">
          {actors.length === 0 ? (
            <div className="text-center py-12">
              <Users size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-[12px] text-gray-500 mb-1">Aucun acteur déclaré pour cette mission.</p>
              <p className="text-[11px] text-gray-400">Ajoutez-les dans l&apos;onglet « Acteurs » du cadrage.</p>
            </div>
          ) : activeTopics.length === 0 ? (
            <div className="text-center py-12 text-[12px] text-gray-500">
              Sélectionnez au moins un sujet ci-dessus pour construire la matrice.
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wide text-gray-500 px-2 py-2 sticky left-0 bg-white z-10">
                    Acteur
                  </th>
                  {activeTopics.map((t) => (
                    <th key={t.id} className="text-center text-[10px] font-bold uppercase tracking-wide text-gold-700 px-2 py-2 min-w-[110px] max-w-[160px]">
                      <div className="line-clamp-2">{t.name}</div>
                      <div className="text-[9px] font-mono text-gold-500 font-normal mt-0.5">{t.control_ids.length} ctrl</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actors.map((a) => {
                  const rowCount = activeTopics.filter((t) => cells.has(cellKey(a.id, t.id))).length
                  return (
                    <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-2 py-2 sticky left-0 bg-white">
                        <div className="text-[12px] font-semibold text-gray-900">{a.name}</div>
                        {a.job_title && <div className="text-[10px] text-gray-400">{a.job_title}</div>}
                        {rowCount > 0 && (
                          <div className="text-[9px] font-mono text-forest-700 mt-0.5">{rowCount} sujet{rowCount > 1 ? 's' : ''}</div>
                        )}
                      </td>
                      {activeTopics.map((t) => {
                        const checked = cells.has(cellKey(a.id, t.id))
                        return (
                          <td key={t.id} className="text-center px-1 py-1">
                            <button
                              type="button"
                              onClick={() => toggleCell(a.id, t.id)}
                              className={`w-7 h-7 rounded border-2 flex items-center justify-center mx-auto transition-colors ${
                                checked
                                  ? 'bg-forest-700 border-forest-700 text-white hover:bg-forest-900'
                                  : 'border-gray-200 bg-white hover:border-forest-300'
                              }`}
                              aria-label={checked ? 'Decocher' : 'Cocher'}
                            >
                              {checked && <Check size={13} />}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Couverture + warnings */}
        {actors.length > 0 && activeTopics.length > 0 && (
          <div className="px-5 py-2.5 border-t border-gray-200 bg-[#FAFAFA]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-semibold text-gray-700">
                {previewSpecs.length} entretien{previewSpecs.length > 1 ? 's' : ''} à générer
              </span>
              <span className="text-[11px] text-gray-400">·</span>
              <span className="text-[11px] text-gray-500">{cellList.length} cellule{cellList.length > 1 ? 's' : ''} cochée{cellList.length > 1 ? 's' : ''}</span>

              {fullCoverage && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded inline-flex items-center gap-1">
                  <Check size={10} /> Couverture complète
                </span>
              )}
              {coverage.uncoveredTopicIds.length > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded inline-flex items-center gap-1">
                  <AlertTriangle size={10} /> {coverage.uncoveredTopicIds.length} sujet{coverage.uncoveredTopicIds.length > 1 ? 's' : ''} non couvert{coverage.uncoveredTopicIds.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {coverage.uncoveredTopicIds.length > 0 && (
              <p className="text-[11px] text-amber-700 mt-1">
                Non couvert{coverage.uncoveredTopicIds.length > 1 ? 's' : ''} : {coverage.uncoveredTopicIds.map((id) => topicNameById.get(id) ?? id).join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[12px] text-gray-700">
            <span>Auditeur affecté</span>
            <select value={auditorId} onChange={(e) => setAuditorId(e.target.value)}
              className="px-2 py-1 border border-gray-200 rounded text-[12px] outline-none focus:border-forest-500">
              <option value="">—</option>
              {auditorMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.user.first_name} {m.user.last_name}</option>
              ))}
            </select>
          </div>
          <button onClick={onClose} className="ml-auto text-[12px] text-gray-500 hover:text-gray-700 px-3 py-2">
            Annuler
          </button>
          <button
            onClick={() => void handleGenerate()}
            disabled={!canGenerate}
            className="bg-forest-700 text-white px-4 py-2 rounded-lg text-[12px] font-semibold hover:bg-forest-900 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {generating ? <><Loader2 size={12} className="animate-spin" /> Génération…</> : <><Sparkles size={12} /> Générer {previewSpecs.length} entretien{previewSpecs.length > 1 ? 's' : ''}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
