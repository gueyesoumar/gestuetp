import { useMemo } from 'react'
import { Users, Mail, FileText, Check, Circle } from 'lucide-react'
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
  onNavigate: (tab: 'client' | 'scope' | 'questionnaire' | 'documents' | 'risks') => void
  actionLoading: boolean
  actionSuccess: string | null
}

type ChecklistTab = 'client' | 'scope' | 'questionnaire' | 'documents' | 'risks'
interface CheckItem { label: string; done: boolean; active: boolean; tab?: ChecklistTab }

export function ScopingProgressSidebar({ mission, client, risks, questionnaireProgress, documentsReceived, documentsExpected, onRemindClient, onGenerateNote, onValidateScoping, onInvitePortal, onNavigate, actionLoading, actionSuccess }: ScopingProgressSidebarProps) {
  const checklist = useMemo((): CheckItem[] => {
    const hasClient = !!client
    const hasScope = mission.status !== 'initialization'
    const questSent = mission.status !== 'initialization'
    const questDone = questionnaireProgress === 100
    const docsDone = documentsExpected > 0 && documentsReceived >= documentsExpected
    const risksValidated = risks.length > 0
    return [
      { label: 'Fiche client compl\u00e9t\u00e9e', done: hasClient, active: !hasClient, tab: 'client' },
      { label: 'P\u00e9rim\u00e8tre d\u00e9fini', done: hasScope, active: hasClient && !hasScope, tab: 'scope' },
      { label: 'Questionnaire envoy\u00e9', done: questSent, active: hasScope && !questSent, tab: 'questionnaire' },
      { label: `Questionnaire compl\u00e9t\u00e9 (${questionnaireProgress}%)`, done: questDone, active: questSent && !questDone, tab: 'questionnaire' },
      {
        label: documentsExpected === 0
          ? 'Documents demand\u00e9s au client'
          : `Documents re\u00e7us (${documentsReceived}/${documentsExpected})`,
        done: docsDone,
        active: questSent && !docsDone,
        tab: 'documents',
      },
      { label: 'Risques initiaux valid\u00e9s', done: risksValidated, active: !risksValidated, tab: 'risks' },
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
        {checklist.map((item, i) => {
          const isClickable = !!item.tab
          return (
            <div
              key={i}
              onClick={isClickable ? () => onNavigate(item.tab!) : undefined}
              className={`flex items-center gap-2.5 py-2 border-b border-gray-50 last:border-b-0 -mx-2 px-2 rounded ${
                isClickable ? 'cursor-pointer hover:bg-forest-50/50 transition-colors' : ''
              }`}
            >
              <CheckIcon done={item.done} active={item.active} />
              <span className={`text-xs ${item.done ? 'text-gray-300 line-through' : 'text-gray-700'}`}>{item.label}</span>
            </div>
          )
        })}
      </div>



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
          <Check size={14} className="inline mr-1" />{actionSuccess}
        </div>
      )}

      {/* Actions */}
      <div className="p-4">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-3">Actions</h4>
        <div className="flex flex-col gap-2">
          <button onClick={onInvitePortal} disabled={actionLoading}
            className="flex items-center gap-2 px-3.5 py-2.5 border border-forest-200 rounded-lg text-xs text-forest-700 bg-forest-50 hover:bg-forest-100 hover:border-forest-300 transition-colors text-left disabled:opacity-50 font-medium">
            <Users size={15} className="w-5 text-center" /> Inviter au portail
          </button>
          <button onClick={onRemindClient} disabled={actionLoading}
            className="flex items-center gap-2 px-3.5 py-2.5 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white hover:bg-forest-50 hover:border-forest-300 transition-colors text-left disabled:opacity-50">
            <Mail size={15} className="w-5 text-center" /> Relancer le client
          </button>
          <button onClick={onGenerateNote} disabled={actionLoading}
            className="flex items-center gap-2 px-3.5 py-2.5 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white hover:bg-forest-50 hover:border-forest-300 transition-colors text-left disabled:opacity-50">
            <FileText size={15} className="w-5 text-center" /> G&eacute;n&eacute;rer la note de cadrage
          </button>
          <button onClick={onValidateScoping} disabled={actionLoading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-forest-700 text-white hover:bg-forest-900 transition-colors disabled:opacity-50">
            <Check size={15} className="w-5 text-center" /> Valider le cadrage
          </button>
        </div>
      </div>
    </div>
  )
}

function CheckIcon({ done, active }: { done: boolean; active: boolean }) {
  if (done) return <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0"><Check size={11} /></div>
  if (active) return <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0"><Circle size={8} /></div>
  return <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-300 flex items-center justify-center text-[10px] shrink-0">&middot;</div>
}
