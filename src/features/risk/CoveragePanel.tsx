import { Link } from 'react-router-dom'
import type { PortfolioOrg } from './useSupervisedPortfolio'

interface Props {
  total: number
  uncovered: PortfolioOrg[]
  canManage: boolean
}

/** Panneau Couverture des affectations : part des assujettis ayant un responsable. */
export function CoveragePanel({ total, uncovered, canManage }: Props): JSX.Element {
  const covered = total - uncovered.length
  const pct = total ? Math.round((covered / total) * 100) : 0
  const names = uncovered.slice(0, 3).map((o) => o.org_name).join(', ')

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="px-4 py-3 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">Couverture des affectations</h3></div>
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-2.5 text-[12px]">
          <span className="w-16 text-gray-600">Affectés</span>
          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full bg-[#27AE60]" style={{ width: `${pct}%` }} /></div>
          <span className="font-mono text-gray-700">{covered}/{total}</span>
        </div>
        {uncovered.length > 0 ? (
          <div className="flex items-start gap-2 text-[11.5px] text-red-600">
            <span className="w-2 h-2 mt-1 rounded-full bg-red-600 shrink-0" />
            <span>{uncovered.length} sans responsable{names ? ` : ${names}` : ''}{uncovered.length > 3 ? ` +${uncovered.length - 3}` : ''}</span>
          </div>
        ) : (
          <div className="text-[11.5px] text-gray-500">Tous les assujettis ont un responsable.</div>
        )}
        {canManage && <Link to="/risque/affectations" className="inline-block text-[12px] font-semibold text-forest-700 hover:underline">Gérer les affectations</Link>}
      </div>
    </div>
  )
}
