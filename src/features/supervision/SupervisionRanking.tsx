import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import type { EntityScore } from './useSupervisionData'

interface SupervisionRankingProps {
  entities: EntityScore[]
}

function statusBadge(score: number): { label: string; variant: 'green' | 'gold' | 'red' } {
  if (score >= 80) return { label: 'Conforme', variant: 'green' }
  if (score >= 60) return { label: 'Partiel', variant: 'gold' }
  return { label: 'Non conforme', variant: 'red' }
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-700'
  if (score >= 60) return 'text-gold-500'
  return 'text-red-600'
}

function barColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-400'
  return 'bg-red-400'
}

function formatDate(iso: string | null): string {
  if (!iso) return '\u2014'
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

export function SupervisionRanking({ entities }: SupervisionRankingProps) {
  if (entities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-sm text-gray-400">Aucune entit&eacute; audit&eacute;e sur ce r&eacute;f&eacute;rentiel.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <th className="px-5 py-3 w-8">#</th>
              <th className="px-3 py-3">Entit&eacute;</th>
              <th className="px-3 py-3">Secteur</th>
              <th className="px-3 py-3">Score</th>
              <th className="px-3 py-3 w-[180px]">Conformit&eacute;</th>
              <th className="px-3 py-3">NC maj.</th>
              <th className="px-3 py-3">Dernier audit</th>
              <th className="px-3 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="text-[13px]">
            {entities.map((entity, i) => {
              const status = statusBadge(entity.globalScore)
              return (
                <tr key={entity.clientId} className="border-b border-gray-50 hover:bg-forest-50/30 cursor-pointer">
                  <td className="px-5 py-3 text-gray-400 font-mono text-[11px]">{i + 1}</td>
                  <td className="px-3 py-3 font-semibold">
                    <Link to={`/supervision/entites/${entity.clientId}`} className="text-forest-700 hover:underline">
                      {entity.clientName}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-gray-500">{entity.sector || '\u2014'}</td>
                  <td className={`px-3 py-3 font-bold ${scoreColor(entity.globalScore)}`}>{entity.globalScore}%</td>
                  <td className="px-3 py-3">
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div className={`h-full rounded-full ${barColor(entity.globalScore)} transition-all`} style={{ width: `${entity.globalScore}%` }} />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge label={String(entity.majorNcCount)} variant={entity.majorNcCount > 5 ? 'red' : entity.majorNcCount > 0 ? 'gold' : 'green'} />
                  </td>
                  <td className="px-3 py-3 text-gray-500">{formatDate(entity.lastAuditDate)}</td>
                  <td className="px-3 py-3">
                    <Badge label={status.label} variant={status.variant} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-4 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {'\u2265'} 80% Conforme</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> 60-79% Partiel</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> &lt; 60% Non conforme</span>
      </div>
    </div>
  )
}
