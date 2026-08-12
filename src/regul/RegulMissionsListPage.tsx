import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, ClipboardCheck, X } from 'lucide-react'
import { useMissions } from '../features/missions/useMissions'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { EmptyState } from '../components/ui/EmptyState'

const STATUS_LABELS: Record<string, string> = {
  initialization: 'Initialisation',
  planning: 'Planification',
  fieldwork: 'Travaux',
  review: 'Revue',
  closure: 'Clôturée',
}

/** Liste des missions de contrôle (Gëstu Regul / M3). */
export function RegulMissionsListPage(): JSX.Element {
  const { missions, loading } = useMissions()

  // Filtre « actives » (tout sauf clôturée) activé depuis la carte du dashboard.
  const [searchParams, setSearchParams] = useSearchParams()
  const activesOnly = searchParams.get('statut') === 'actives'
  const visible = useMemo(
    () => (activesOnly ? missions.filter((m) => m.status !== 'closure') : missions),
    [missions, activesOnly],
  )
  const clearFilter = (): void => {
    const next = new URLSearchParams(searchParams)
    next.delete('statut')
    setSearchParams(next, { replace: true })
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Missions de contrôle</h1>
          <p className="mt-1 text-[13px] text-gray-500">
            {visible.length === 0 ? 'Aucune mission de contrôle.' : `${visible.length} mission${visible.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <Link to="/controles/nouvelle" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900">
          <Plus size={16} /> Nouvelle mission
        </Link>
      </div>

      {activesOnly && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1 text-[12px] font-semibold text-forest-700">
          Filtre&nbsp;: missions actives
          <button onClick={clearFilter} className="text-forest-500 hover:text-forest-900" aria-label="Effacer le filtre"><X size={13} /></button>
        </span>
      )}

      {visible.length === 0 ? (
        <EmptyState title="Aucune mission de contrôle" description={activesOnly ? 'Aucune mission active — toutes vos missions sont clôturées.' : 'Planifiez votre premier audit sur un assujetti avec le bouton ci-dessus.'} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 font-semibold">Mission</th>
                <th className="px-4 py-3 font-semibold">Assujetti</th>
                <th className="px-4 py-3 font-semibold">Référentiel</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Avancement</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-forest-50/40">
                  <td className="px-4 py-3">
                    <Link to={`/controles/${m.id}`} className="flex items-center gap-2 font-medium text-forest-800 hover:text-forest-900">
                      <ClipboardCheck size={15} className="text-forest-600" /> {m.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{m.client?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{m.framework?.name ?? '—'}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">{STATUS_LABELS[m.status] ?? m.status}</span></td>
                  <td className="px-4 py-3 text-gray-700">{m.progressPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
