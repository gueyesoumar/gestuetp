import { Link } from 'react-router-dom'
import type { SubsidiaryMissionRow } from './useSubsidiaryDetail'

interface SubsidiaryMissionsListProps {
  missions: SubsidiaryMissionRow[]
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  initialization: { label: 'Initialisation', color: 'text-gray-600 bg-gray-100' },
  scoping: { label: 'Cadrage', color: 'text-blue-700 bg-blue-50' },
  planning: { label: 'Planification', color: 'text-blue-700 bg-blue-50' },
  fieldwork: { label: 'Travaux', color: 'text-amber-700 bg-amber-50' },
  internal_review: { label: 'Revue interne', color: 'text-amber-700 bg-amber-50' },
  client_review: { label: 'Validation client', color: 'text-purple-700 bg-purple-50' },
  closure: { label: 'Clôture', color: 'text-green-700 bg-green-50' },
}

function formatShortDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function SubsidiaryMissionsList({ missions }: SubsidiaryMissionsListProps): JSX.Element {
  if (missions.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <p className="text-sm text-gray-400">Aucune mission sur cette filiale.</p>
      </div>
    )
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Mission</th>
            <th className="text-left px-4 py-3 font-semibold">Référentiel</th>
            <th className="text-left px-4 py-3 font-semibold">Type</th>
            <th className="text-left px-4 py-3 font-semibold">Statut</th>
            <th className="text-left px-4 py-3 font-semibold">Score</th>
            <th className="text-left px-4 py-3 font-semibold">Plans ouverts</th>
            <th className="text-left px-4 py-3 font-semibold">Période</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-[13px]">
          {missions.map((m) => {
            const st = STATUS_LABEL[m.status] ?? STATUS_LABEL.initialization
            return (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/missions/${m.id}`} className="font-semibold text-forest-700 hover:underline">{m.name}</Link>
                  {m.leadAuditorName && (
                    <p className="text-[11px] text-gray-500 mt-0.5">Lead : {m.leadAuditorName}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">{m.framework_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    m.kind === 'continuous_supervision' ? 'bg-amber-50 text-amber-700' : 'bg-forest-50 text-forest-700'
                  }`}>
                    {m.kind === 'continuous_supervision' ? 'Supervision' : 'Audit'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {m.conformityScore !== null ? `${m.conformityScore}%` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={m.overdueCarsCount > 0 ? 'text-red-700 font-semibold' : 'text-gray-700'}>
                    {m.openCarsCount}
                    {m.overdueCarsCount > 0 && <span className="ml-1.5 text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">{m.overdueCarsCount} retard</span>}
                  </span>
                </td>
                <td className="px-4 py-3 text-[12px] text-gray-500">
                  {formatShortDate(m.start_date)} → {formatShortDate(m.end_date)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
