import { Link } from 'react-router-dom'
import { useVocab } from '../edition/useVocab'
import { MISSION_STATUS_LABELS } from '../missions/mission-constants'
import type { SubsidiaryMissionRow } from './useSubsidiaryDetail'

interface SubsidiaryMissionsListProps {
  missions: SubsidiaryMissionRow[]
}

// Couleurs par statut ; les LIBELLÉS viennent de la source unique MISSION_STATUS_LABELS.
const STATUS_COLOR: Record<string, string> = {
  initialization: 'text-gray-600 bg-gray-100',
  scoping: 'text-blue-700 bg-blue-50',
  planning: 'text-blue-700 bg-blue-50',
  fieldwork: 'text-amber-700 bg-amber-50',
  internal_review: 'text-amber-700 bg-amber-50',
  client_review: 'text-purple-700 bg-purple-50',
  closure: 'text-green-700 bg-green-50',
}

function formatShortDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function SubsidiaryMissionsList({ missions }: SubsidiaryMissionsListProps): JSX.Element {
  const vocab = useVocab()
  if (missions.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <p className="text-sm text-gray-400">Aucune mission sur {vocab.entityWithDem}.</p>
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
            const color = STATUS_COLOR[m.status] ?? STATUS_COLOR.initialization
            const label = MISSION_STATUS_LABELS[m.status as keyof typeof MISSION_STATUS_LABELS] ?? m.status
            return (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`${vocab.missionRouteBase}/${m.id}`} className="font-semibold text-forest-700 hover:underline">{m.name}</Link>
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
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
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
