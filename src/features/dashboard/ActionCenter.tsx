import { useState } from 'react'
import { CheckCircle, Paperclip, Mail } from 'lucide-react'
import type { DashboardStats, MissionSummary } from './useDashboardStats'

interface ActionCenterProps {
  stats: DashboardStats
  missions: MissionSummary[]
}

type TabKey = 'validations' | 'documents' | 'relances'

interface ActionEntry {
  id: string
  icon: typeof CheckCircle
  dotColor: string
  description: string
  missionTag: string
}

function buildActions(stats: DashboardStats, missions: MissionSummary[]): Record<TabKey, ActionEntry[]> {
  const validations: ActionEntry[] = []
  const documents: ActionEntry[] = []
  const relances: ActionEntry[] = []

  if (stats.clientRejections > 0) {
    validations.push({
      id: 'rej-global',
      icon: CheckCircle,
      dotColor: 'bg-error',
      description: `${stats.clientRejections} contr\u00f4le${stats.clientRejections > 1 ? 's' : ''} rejet\u00e9${stats.clientRejections > 1 ? 's' : ''} \u00e0 corriger`,
      missionTag: 'Toutes missions',
    })
  }

  if (stats.pendingReviews > 0) {
    validations.push({
      id: 'rev-global',
      icon: CheckCircle,
      dotColor: 'bg-gold-500',
      description: `${stats.pendingReviews} contr\u00f4le${stats.pendingReviews > 1 ? 's' : ''} soumis en attente de revue`,
      missionTag: 'Toutes missions',
    })
  }

  for (const m of missions.filter((m) => m.status === 'planning' || m.status === 'initialization')) {
    relances.push({
      id: `plan-${m.id}`,
      icon: Mail,
      dotColor: 'bg-forest-500',
      description: `Affecter les contr\u00f4les de la mission`,
      missionTag: m.name,
    })
  }

  if (stats.totalDocuments === 0 && missions.length > 0) {
    documents.push({
      id: 'doc-missing',
      icon: Paperclip,
      dotColor: 'bg-gold-500',
      description: 'Aucun document collect\u00e9 sur les missions actives',
      missionTag: 'Toutes missions',
    })
  }

  for (const m of missions.filter((m) => m.status === 'fieldwork' && m.totalControls > 0)) {
    const pct = Math.round((m.evaluatedControls / m.totalControls) * 100)
    if (pct < 50) {
      relances.push({
        id: `low-${m.id}`,
        icon: Mail,
        dotColor: 'bg-gold-500',
        description: `Progression faible (${pct}%), relancer l\u2019\u00e9quipe`,
        missionTag: m.name,
      })
    }
  }

  return { validations, documents, relances }
}

const TAB_CONFIG: { key: TabKey; label: string }[] = [
  { key: 'validations', label: 'Validations' },
  { key: 'documents', label: 'Documents' },
  { key: 'relances', label: 'Relances' },
]

const MAX_VISIBLE = 4

export function ActionCenter({ stats, missions }: ActionCenterProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>('validations')
  const [expanded, setExpanded] = useState(false)
  const actions = buildActions(stats, missions)
  const currentActions = actions[activeTab]
  const visible = expanded ? currentActions : currentActions.slice(0, MAX_VISIBLE)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-[15px] font-bold text-gray-900 mb-3">Centre d&apos;actions</h3>
      <div className="flex gap-1 mb-4">
        {TAB_CONFIG.map(({ key, label }) => {
          const count = actions[key].length
          return (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setExpanded(false) }}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === key
                  ? 'bg-forest-100 text-forest-700'
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                  activeTab === key ? 'bg-forest-700 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {currentActions.length === 0 ? (
        <p className="text-[13px] text-gray-400 py-2">Aucune action en attente.</p>
      ) : (
        <div>
          {visible.map((action) => {
            const Icon = action.icon
            return (
              <div key={action.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${action.dotColor}`} />
                <Icon className="h-4 w-4 text-gray-300 shrink-0" />
                <div className="flex-1 text-[13px] text-gray-700">{action.description}</div>
                <span className="text-[10px] text-gray-300 bg-gray-50 px-2 py-0.5 rounded-full shrink-0 truncate max-w-[120px]">
                  {action.missionTag}
                </span>
              </div>
            )
          })}
          {currentActions.length > MAX_VISIBLE && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-[12px] text-forest-700 font-medium hover:text-forest-900 transition-colors"
            >
              {expanded ? 'Voir moins' : `Voir tout (${currentActions.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
