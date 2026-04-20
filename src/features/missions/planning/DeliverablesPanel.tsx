import { Check, Circle } from 'lucide-react'
import type { MissionStatus } from '../../../types/database.types'

interface DeliverablesPanelProps {
  missionStatus: MissionStatus
}

interface Deliverable {
  label: string
  phase: MissionStatus[]
}

const DELIVERABLES: { section: string; items: Deliverable[] }[] = [
  {
    section: 'Phase Cadrage',
    items: [
      { label: 'Questionnaire de prise de connaissance', phase: ['scoping', 'planning', 'fieldwork', 'internal_review', 'client_review', 'closure'] },
      { label: 'Preuves initiales collect\u00e9es', phase: ['planning', 'fieldwork', 'internal_review', 'client_review', 'closure'] },
    ],
  },
  {
    section: 'Phase Planification',
    items: [
      { label: 'Programme de travail valid\u00e9', phase: ['fieldwork', 'internal_review', 'client_review', 'closure'] },
      { label: 'Planning des entretiens confirm\u00e9', phase: ['fieldwork', 'internal_review', 'client_review', 'closure'] },
      { label: 'Lettre de mission sign\u00e9e', phase: ['fieldwork', 'internal_review', 'client_review', 'closure'] },
    ],
  },
  {
    section: 'Phase Travaux terrain',
    items: [
      { label: 'Feuilles de travail (constats par contr\u00f4le)', phase: ['internal_review', 'client_review', 'closure'] },
      { label: 'Rapport d\u2019audit provisoire', phase: ['client_review', 'closure'] },
    ],
  },
  {
    section: 'Phase Cl\u00f4ture',
    items: [
      { label: 'Rapport final + plan d\u2019action', phase: ['closure'] },
    ],
  },
]

export function DeliverablesPanel({ missionStatus }: DeliverablesPanelProps) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-200">
        <span className="text-[13px] font-semibold text-gray-900">Livrables attendus par phase</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {DELIVERABLES.map((section) => (
          <div key={section.section} className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2 pb-1.5 border-b border-gray-200">{section.section}</p>
            {section.items.map((item) => {
              const done = item.phase.includes(missionStatus)
              const isCurrent = !done && item.phase.some((p) => isNextPhase(missionStatus, p))
              return (
                <div key={item.label} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-b-0">
                  <StatusIcon done={done} current={isCurrent} />
                  <span className={`flex-1 text-xs ${done ? 'text-gray-700' : 'text-gray-400'}`}>{item.label}</span>
                  <StatusBadge done={done} current={isCurrent} />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusIcon({ done, current }: { done: boolean; current: boolean }) {
  if (done) return <Check size={14} className="text-green-600" />
  if (current) return <Circle size={14} className="text-blue-500 fill-blue-500" />
  return <Circle size={14} className="text-gray-300" />
}

function StatusBadge({ done, current }: { done: boolean; current: boolean }) {
  if (done) return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600">Termin&eacute;</span>
  if (current) return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">En cours</span>
  return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">En attente</span>
}

const PHASE_ORDER: MissionStatus[] = ['initialization', 'scoping', 'planning', 'fieldwork', 'internal_review', 'client_review', 'closure']
function isNextPhase(current: MissionStatus, target: MissionStatus): boolean {
  return PHASE_ORDER.indexOf(target) === PHASE_ORDER.indexOf(current) + 1
}
