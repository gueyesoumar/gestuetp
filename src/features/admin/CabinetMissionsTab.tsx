import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useCabinetMissionsAll, type CabinetMission } from './useCabinetMissionsAll'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'

interface Props {
  cabinetId: string
}

const STATUS_LABELS: Record<string, { label: string; variant: 'green' | 'gold' | 'gray' | 'blue' }> = {
  initialization: { label: 'Initialisation', variant: 'gray' },
  scoping: { label: 'Cadrage', variant: 'blue' },
  planning: { label: 'Planification', variant: 'blue' },
  fieldwork: { label: 'Travaux', variant: 'gold' },
  internal_review: { label: 'Revue interne', variant: 'gold' },
  client_review: { label: 'Revue client', variant: 'gold' },
  closure: { label: 'Clôturée', variant: 'green' },
}

export function CabinetMissionsTab({ cabinetId }: Props) {
  const { missions, loading, error } = useCabinetMissionsAll(cabinetId)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return missions.filter((m) => {
      if (statusFilter === 'active' && m.status === 'closure') return false
      if (statusFilter === 'closed' && m.status !== 'closure') return false
      if (q && !m.name.toLowerCase().includes(q) && !m.client_name?.toLowerCase().includes(q)) return false
      return true
    })
  }, [missions, search, statusFilter])

  const counts = useMemo(() => ({
    active: missions.filter((m) => m.status !== 'closure').length,
    closed: missions.filter((m) => m.status === 'closure').length,
  }), [missions])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer par nom de mission ou client…"
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[12.5px] w-80 bg-page-bg"
          />
        </div>
        <FilterPill label={`Toutes · ${missions.length}`} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        <FilterPill label={`En cours · ${counts.active}`} active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} variant="green" />
        <FilterPill label={`Clôturées · ${counts.closed}`} active={statusFilter === 'closed'} onClick={() => setStatusFilter('closed')} variant="gray" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center text-[12.5px] text-gray-300">
          Aucune mission ne correspond.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-page-bg text-[10.5px] uppercase tracking-wider text-gray-300 font-semibold">
                <th className="text-left px-4 py-3 border-b border-gray-200">Mission</th>
                <th className="text-left px-4 py-3 border-b border-gray-200">Client</th>
                <th className="text-left px-4 py-3 border-b border-gray-200">Référentiel</th>
                <th className="text-left px-4 py-3 border-b border-gray-200">Lead</th>
                <th className="text-left px-4 py-3 border-b border-gray-200">Statut</th>
                <th className="text-left px-4 py-3 border-b border-gray-200">Mise à jour</th>
                <th className="px-4 py-3 border-b border-gray-200" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => <Row key={m.id} mission={m} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Row({ mission }: { mission: CabinetMission }) {
  const status = STATUS_LABELS[mission.status] ?? { label: mission.status, variant: 'gray' as const }
  const variantClass = {
    green: 'bg-green-50 text-green-700',
    gold: 'bg-gold-50 text-gold-600',
    gray: 'bg-gray-100 text-gray-500',
    blue: 'bg-blue-50 text-blue-700',
  }[status.variant]
  return (
    <tr className="hover:bg-page-bg">
      <td className="px-4 py-3 border-b border-gray-100">
        <div className="font-semibold text-gray-900 text-[13px] truncate max-w-xs" title={mission.name}>{mission.name}</div>
      </td>
      <td className="px-4 py-3 border-b border-gray-100 text-[12px] text-gray-700">{mission.client_name ?? '—'}</td>
      <td className="px-4 py-3 border-b border-gray-100 text-[12px] text-gray-700">{mission.framework_name ?? '—'}</td>
      <td className="px-4 py-3 border-b border-gray-100 text-[12px] text-gray-700">{mission.lead_first_name ? `${mission.lead_first_name} ${mission.lead_last_name}` : <span className="text-gray-300">—</span>}</td>
      <td className="px-4 py-3 border-b border-gray-100"><span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${variantClass}`}>{status.label}</span></td>
      <td className="px-4 py-3 border-b border-gray-100 text-[11.5px] text-gray-500">{new Date(mission.updated_at).toLocaleDateString('fr-FR')}</td>
      <td className="px-4 py-3 border-b border-gray-100 text-right">
        <Link to={`/missions/${mission.id}`} className="text-forest-700 text-[12px] font-semibold hover:text-forest-900">Voir &rarr;</Link>
      </td>
    </tr>
  )
}

function FilterPill({ label, active, onClick, variant }: { label: string; active: boolean; onClick: () => void; variant?: 'green' | 'gray' }) {
  const colors = active
    ? variant === 'green' ? 'bg-forest-700 text-white' : 'bg-gray-700 text-white'
    : variant === 'green' ? 'bg-green-50 text-green-700 border border-green-200' : variant === 'gray' ? 'bg-gray-50 text-gray-500 border border-gray-200' : 'bg-white text-gray-600 border border-gray-200'
  return (
    <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition-colors ${colors}`}>
      {label}
    </button>
  )
}
