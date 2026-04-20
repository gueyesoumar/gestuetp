import { Users, FileText, Clock, ArrowRight } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import type { MissionSummary } from './useDashboardStats'

interface ClientPortfolioProps {
  missions: MissionSummary[]
}

interface ClientGroup {
  clientName: string
  clientSector: string
  missions: MissionSummary[]
}

const statusBadge: Record<string, { label: string; variant: 'forest' | 'gold' | 'green' | 'gray' }> = {
  initialization: { label: 'Init.', variant: 'gray' },
  scoping: { label: 'Cadrage', variant: 'gray' },
  planning: { label: 'Planif.', variant: 'forest' },
  fieldwork: { label: 'Travaux', variant: 'forest' },
  internal_review: { label: 'Revue', variant: 'gold' },
  client_review: { label: 'Client', variant: 'gold' },
  closure: { label: 'Cl\u00f4tur\u00e9e', variant: 'green' },
}

function healthDotClass(pct: number): string {
  if (pct >= 80) return 'bg-success'
  if (pct >= 60) return 'bg-gold-500'
  return 'bg-error'
}

function groupByClient(missions: MissionSummary[]): ClientGroup[] {
  const map = new Map<string, ClientGroup>()
  for (const m of missions) {
    const key = m.clientName || 'Sans client'
    if (!map.has(key)) {
      map.set(key, { clientName: key, clientSector: m.clientSector, missions: [] })
    }
    map.get(key)!.missions.push(m)
  }
  return Array.from(map.values())
}

export function ClientPortfolio({ missions }: ClientPortfolioProps): JSX.Element {
  const groups = groupByClient(missions)

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-[15px] font-bold text-gray-900 mb-2">Portefeuille clients</h3>
        <p className="text-[13px] text-gray-400">Aucune mission active.</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-[15px] font-bold text-gray-900 mb-3">Portefeuille clients</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <ClientCard key={group.clientName} group={group} />
        ))}
      </div>
    </div>
  )
}

function ClientCard({ group }: { group: ClientGroup }): JSX.Element {
  const totalControls = group.missions.reduce((s, m) => s + m.totalControls, 0)
  const evaluatedControls = group.missions.reduce((s, m) => s + m.evaluatedControls, 0)
  const pct = totalControls > 0 ? Math.round((evaluatedControls / totalControls) * 100) : 0
  const barColor = pct >= 80 ? 'bg-success' : pct >= 60 ? 'bg-gold-500' : 'bg-error'

  const now = new Date()
  const nearestEnd = group.missions
    .filter((m) => m.endDate)
    .map((m) => Math.ceil((new Date(m.endDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    .filter((d) => d >= 0)
    .sort((a, b) => a - b)[0]

  const latestUpdate = group.missions
    .map((m) => m.updatedAt)
    .sort()
    .reverse()[0]

  const lastActivity = latestUpdate
    ? new Date(latestUpdate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : '\u2014'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow group cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${healthDotClass(pct)}`} />
            <h4 className="text-[14px] font-bold text-gray-900 truncate">{group.clientName}</h4>
          </div>
          {group.clientSector && (
            <Badge label={group.clientSector} variant="gray" />
          )}
        </div>
        <ArrowRight className="h-4 w-4 text-gray-200 group-hover:text-forest-500 transition-colors shrink-0 mt-1" />
      </div>

      {group.missions.map((m) => {
        const badge = statusBadge[m.status] ?? statusBadge.initialization
        return (
          <div key={m.id} className="mb-2 last:mb-0">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-gray-700 truncate">{m.name}</span>
              <Badge label={badge.label} variant={badge.variant} />
            </div>
          </div>
        )
      })}

      <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] text-gray-400 mt-1">{pct}% de conformit&eacute;</div>

      <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-400">
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" /> {totalControls} contr&ocirc;les
        </span>
        {nearestEnd !== undefined && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {nearestEnd}j restants
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" /> {lastActivity}
        </span>
      </div>
    </div>
  )
}
