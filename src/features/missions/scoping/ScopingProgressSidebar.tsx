import { useMemo } from 'react'
import { Badge } from '../../../components/ui/Badge'
import type { MissionDetail, MissionMemberRow } from '../useMissionDetail'
import type { MissionExclusion, MissionRisk, CabinetClient } from '../../../types/database.types'

interface ScopingProgressSidebarProps {
  mission: MissionDetail
  members: MissionMemberRow[]
  client: CabinetClient | null
  exclusions: MissionExclusion[]
  risks: MissionRisk[]
  questionnaireProgress: number
  documentsReceived: number
  documentsExpected: number
  onRemindClient: () => void
  onGenerateNote: () => void
  onValidateScoping: () => void
  onInvitePortal: () => void
  actionLoading: boolean
  actionSuccess: string | null
}

interface CheckItem { label: string; done: boolean; active: boolean }

export function ScopingProgressSidebar({ mission, client, risks, questionnaireProgress, documentsReceived, documentsExpected, onRemindClient, onGenerateNote, onValidateScoping, onInvitePortal, actionLoading, actionSuccess }: ScopingProgressSidebarProps) {
  const checklist = useMemo((): CheckItem[] => {
    const hasClient = !!client
    const hasScope = mission.status !== 'initialization'
    const questSent = mission.status !== 'initialization'
    const questDone = questionnaireProgress === 100
    const docsDone = documentsExpected > 0 && documentsReceived >= documentsExpected
    const risksValidated = risks.length > 0
    return [
      { label: 'Fiche client compl\u00e9t\u00e9e', done: hasClient, active: !hasClient },
      { label: 'P\u00e9rim\u00e8tre d\u00e9fini', done: hasScope, active: hasClient && !hasScope },
      { label: 'Questionnaire envoy\u00e9', done: questSent, active: hasScope && !questSent },
      { label: `Questionnaire compl\u00e9t\u00e9 (${questionnaireProgress}%)`, done: questDone, active: questSent && !questDone },
      { label: `Documents re\u00e7us (${documentsReceived}/${documentsExpected})`, done: docsDone, active: questSent && !docsDone },
      { label: 'Risques initiaux valid\u00e9s', done: risksValidated, active: !risksValidated },
      { label: 'Note de cadrage valid\u00e9e', done: false, active: false },
    ]
  }, [mission, client, questionnaireProgress, documentsReceived, documentsExpected, risks])

  const doneCount = checklist.filter((c) => c.done).length
  const pct = Math.round((doneCount / checklist.length) * 100)

  return (
    <div className="flex flex-col overflow-y-auto bg-[#FAFAF8]">
      {/* Progress score */}
      <div className="p-4 border-b border-gray-200 text-center">
        <p className="text-4xl font-extrabold text-forest-700">{pct}%</p>
        <p className="text-[11px] text-gray-500 mt-1">Cadrage compl&eacute;t&eacute;</p>
        <div className="h-1.5 bg-gray-200 rounded-full mt-3 mx-4">
          <div className="h-1.5 rounded-full bg-forest-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Checklist */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-3">Checklist de cadrage</h4>
        {checklist.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5 py-2 border-b border-gray-50 last:border-b-0">
            <CheckIcon done={item.done} active={item.active} />
            <span className={`text-xs ${item.done ? 'text-gray-300 line-through' : 'text-gray-700'}`}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Stakeholders */}
      {client && client.parties_interessees.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-3">Interlocuteurs cl&eacute;s</h4>
          {client.parties_interessees.slice(0, 5).map((p, i) => (
            <div key={i} className="flex items-center gap-2.5 py-2 border-b border-gray-50 last:border-b-0">
              <div className="w-7 h-7 rounded-full bg-gray-400 text-white flex items-center justify-center text-[10px] font-semibold shrink-0">
                {p.nom.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{p.nom}</p>
                <p className="text-[10px] text-gray-300">{p.type}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Regulations */}
      {client && client.exigences_reglementaires.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-3">R&eacute;glementations</h4>
          <div className="space-y-1.5">
            {client.exigences_reglementaires.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <Badge label={e.impact === 'fort' ? 'Fort' : e.impact === 'moyen' ? 'Moyen' : 'Faible'} variant={e.impact === 'fort' ? 'red' : e.impact === 'moyen' ? 'gold' : 'gray'} />
                <span className="text-gray-700 truncate">{e.nom}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success message */}
      {actionSuccess && (
        <div className="mx-4 mt-4 p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 text-center">
          &#10003; {actionSuccess}
        </div>
      )}

      {/* Actions */}
      <div className="p-4">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-3">Actions</h4>
        <div className="flex flex-col gap-2">
          <button onClick={onInvitePortal} disabled={actionLoading}
            className="flex items-center gap-2 px-3.5 py-2.5 border border-forest-200 rounded-lg text-xs text-forest-700 bg-forest-50 hover:bg-forest-100 hover:border-forest-300 transition-colors text-left disabled:opacity-50 font-medium">
            <span className="w-5 text-center text-sm">&#128101;</span> Inviter au portail
          </button>
          <button onClick={onRemindClient} disabled={actionLoading}
            className="flex items-center gap-2 px-3.5 py-2.5 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white hover:bg-forest-50 hover:border-forest-300 transition-colors text-left disabled:opacity-50">
            <span className="w-5 text-center text-sm">&#128231;</span> Relancer le client
          </button>
          <button onClick={onGenerateNote} disabled={actionLoading}
            className="flex items-center gap-2 px-3.5 py-2.5 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white hover:bg-forest-50 hover:border-forest-300 transition-colors text-left disabled:opacity-50">
            <span className="w-5 text-center text-sm">&#128196;</span> G&eacute;n&eacute;rer la note de cadrage
          </button>
          <button onClick={onValidateScoping} disabled={actionLoading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-forest-700 text-white hover:bg-forest-900 transition-colors disabled:opacity-50">
            <span className="w-5 text-center">&#10003;</span> Valider le cadrage
          </button>
        </div>
      </div>
    </div>
  )
}

function CheckIcon({ done, active }: { done: boolean; active: boolean }) {
  if (done) return <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px] shrink-0">&#10003;</div>
  if (active) return <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] shrink-0">&#9679;</div>
  return <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-300 flex items-center justify-center text-[10px] shrink-0">&middot;</div>
}
