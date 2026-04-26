import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import { useAdminCabinets, type AdminCabinet } from '../../features/admin/useAdminCabinets'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { CreateCabinetWizard } from '../../features/admin/CreateCabinetWizard'

type StatusFilter = 'all' | 'active' | 'suspended'

export function CabinetsListPage() {
  const { cabinets, loading, error, refetch } = useAdminCabinets()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [wizardOpen, setWizardOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cabinets.filter((c) => {
      if (filter === 'active' && !c.is_active) return false
      if (filter === 'suspended' && c.is_active) return false
      if (q && !c.name.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q)) return false
      return true
    })
  }, [cabinets, search, filter])

  const counts = useMemo(() => ({
    active: cabinets.filter((c) => c.is_active).length,
    suspended: cabinets.filter((c) => !c.is_active).length,
    total: cabinets.length,
  }), [cabinets])

  if (loading) return <div className="p-8"><LoadingSpinner /></div>
  if (error) return <div className="p-8"><ErrorAlert message={error} /></div>

  return (
    <div className="px-7 py-6">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[11.5px] text-gray-500"><b className="text-forest-900 font-semibold">Admin</b> &rsaquo; Cabinets</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Tous les cabinets</h1>
      <p className="text-[12.5px] text-gray-500 mb-5">{counts.total} organisations &mdash; {counts.active} actives, {counts.suspended} suspendues.</p>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer par nom, slug…"
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[12.5px] w-72 bg-page-bg"
          />
        </div>
        <FilterPill label={`Actifs · ${counts.active}`} active={filter === 'active'} onClick={() => setFilter('active')} variant="green" />
        <FilterPill label={`Suspendus · ${counts.suspended}`} active={filter === 'suspended'} onClick={() => setFilter('suspended')} variant="warn" />
        <FilterPill label={`Tous · ${counts.total}`} active={filter === 'all'} onClick={() => setFilter('all')} variant="gray" />
        <button
          onClick={() => setWizardOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 bg-forest-700 text-white rounded-lg text-[12.5px] font-semibold hover:bg-forest-900"
        >
          <Plus size={14} />
          Onboarder un cabinet
        </button>
      </div>

      {wizardOpen && (
        <CreateCabinetWizard onClose={() => setWizardOpen(false)} onCreated={refetch} />
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-page-bg text-[10.5px] uppercase tracking-wider text-gray-300 font-semibold">
              <th className="text-left px-4 py-3 border-b border-gray-200">Cabinet</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Plan</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Membres</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Missions</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Dernière activité</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Statut</th>
              <th className="px-4 py-3 border-b border-gray-200" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-300 text-[12px]">Aucun cabinet ne correspond.</td></tr>
            ) : (
              filtered.map((c) => <CabinetRow key={c.id} cabinet={c} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CabinetRow({ cabinet }: { cabinet: AdminCabinet }) {
  return (
    <tr className="hover:bg-page-bg">
      <td className="px-4 py-3 border-b border-gray-100">
        <Link to={`/admin/cabinets/${cabinet.id}`} className="flex items-center gap-2.5 hover:opacity-80">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-extrabold flex-shrink-0 ${cabinet.is_active ? 'bg-forest-100 text-forest-700' : 'bg-red-50 text-red-600'}`}>
            {cabinet.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-[13px]">{cabinet.name}</div>
            <div className="text-[11px] text-gray-300">{cabinet.slug}</div>
          </div>
        </Link>
      </td>
      <td className="px-4 py-3 border-b border-gray-100">{cabinet.plan_name ? <Pill text={cabinet.plan_name} variant="gold" /> : <span className="text-gray-300 text-[11px]">—</span>}</td>
      <td className="px-4 py-3 border-b border-gray-100">{cabinet.members_count}</td>
      <td className="px-4 py-3 border-b border-gray-100">{cabinet.missions_count}</td>
      <td className="px-4 py-3 border-b border-gray-100 text-[12px] text-gray-500">{formatRelative(cabinet.last_activity_at)}</td>
      <td className="px-4 py-3 border-b border-gray-100">{cabinet.is_active ? <Pill text="Actif" variant="green" /> : <Pill text="Suspendu" variant="red" />}</td>
      <td className="px-4 py-3 border-b border-gray-100 text-right">
        <Link to={`/admin/cabinets/${cabinet.id}`} className="text-forest-700 text-[12px] font-semibold hover:text-forest-900">Détail &rarr;</Link>
      </td>
    </tr>
  )
}

function FilterPill({ label, active, onClick, variant }: { label: string; active: boolean; onClick: () => void; variant: 'green' | 'warn' | 'gray' }) {
  const colors = active
    ? variant === 'green' ? 'bg-forest-700 text-white' : variant === 'warn' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-white'
    : variant === 'green' ? 'bg-green-50 text-green-700 border border-green-200' : variant === 'warn' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
  return (
    <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition-colors ${colors}`}>
      {label}
    </button>
  )
}

function Pill({ text, variant }: { text: string; variant: 'green' | 'red' | 'gold' | 'gray' }) {
  const map = {
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    gold: 'bg-gold-50 text-gold-600',
    gray: 'bg-gray-100 text-gray-500',
  }
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[variant]}`}>{text}</span>
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `il y a ${d} j`
  return new Date(iso).toLocaleDateString('fr-FR')
}
