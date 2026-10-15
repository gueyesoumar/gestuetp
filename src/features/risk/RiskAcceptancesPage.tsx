import { ShieldCheck } from 'lucide-react'
import { useRiskAcceptancesList } from './useRiskAcceptance'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import type { RiskAcceptanceStatus } from '../../types/database.types'

const statusCfg: Record<RiskAcceptanceStatus, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-green-50 text-green-700' },
  expired: { label: 'Expirée', cls: 'bg-amber-50 text-amber-700' },
  revoked: { label: 'Révoquée', cls: 'bg-gray-100 text-gray-500' },
  superseded: { label: 'Invalidée', cls: 'bg-red-50 text-red-700' },
}

/** Registre consolidé des acceptations du risque résiduel (RFC 0017 Lot 3). */
export function RiskAcceptancesPage(): JSX.Element {
  const { rows, loading, error } = useRiskAcceptancesList()
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><ShieldCheck size={20} className="text-[#E07A5F]" /> Acceptations</h1>
        <p className="mt-1 text-[13px] text-gray-500">Registre des décisions d'acceptation du risque résiduel : approbateur, résiduel figé, validité.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucune acceptation" description="Les décisions d'acceptation posées sur les scénarios apparaîtront ici." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Risque</th>
                <th className="text-left px-4 py-3 font-semibold">Résiduel</th>
                <th className="text-left px-4 py-3 font-semibold">Date</th>
                <th className="text-left px-4 py-3 font-semibold">Valable jusqu'au</th>
                <th className="text-left px-4 py-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{r.scenario_title ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold">{r.residual_level}</span>
                    {r.is_derogation && <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">dérogatoire</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.accepted_at.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-gray-500">{r.valid_until ?? '-'}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${statusCfg[r.status].cls}`}>{statusCfg[r.status].label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
