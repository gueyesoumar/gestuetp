import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import { useAdminCabinets, type AdminCabinet } from '../../features/admin/useAdminCabinets'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { CreateCabinetWizard } from '../../features/admin/CreateCabinetWizard'

type StatusFilter = 'all' | 'active' | 'suspended'
type TypeFilter = 'all' | 'cabinet' | 'client' | 'groupe' | 'platform' | 'autre'

const TYPE_LABELS: Record<string, { label: string; variant: 'forest' | 'blue' | 'gold' | 'purple' | 'gray' }> = {
  cabinet: { label: 'Cabinet', variant: 'forest' },
  client: { label: 'Client', variant: 'blue' },
  groupe: { label: 'Groupe', variant: 'gold' },
  platform: { label: 'Plateforme', variant: 'purple' },
}

function classifyType(types: string[]): TypeFilter {
  if (types.includes('cabinet')) return 'cabinet'
  if (types.includes('client')) return 'client'
  if (types.includes('groupe')) return 'groupe'
  if (types.includes('platform')) return 'platform'
  return 'autre'
}

export function CabinetsListPage() {
  const { cabinets, loading, error, refetch } = useAdminCabinets()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [wizardOpen, setWizardOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cabinets.filter((c) => {
      if (statusFilter === 'active' && !c.is_active) return false
      if (statusFilter === 'suspended' && c.is_active) return false
      if (typeFilter !== 'all' && classifyType(c.types) !== typeFilter) return false
      if (q && !c.name.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q)) return false
      return true
    })
  }, [cabinets, search, statusFilter, typeFilter])

  const counts = useMemo(() => {
    const byType: Record<string, number> = { cabinet: 0, client: 0, groupe: 0, platform: 0, autre: 0 }
    let active = 0
    let suspended = 0
    for (const c of cabinets) {
      byType[classifyType(c.types)]++
      if (c.is_active) active++; else suspended++
    }
    return { byType, active, suspended, total: cabinets.length }
  }, [cabinets])

  if (loading) return <div className="p-8"><LoadingSpinner /></div>
  if (error) return <div className="p-8"><ErrorAlert message={error} /></div>

  return (
    <div className="px-7 py-6">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[11.5px] text-gray-500"><b className="text-forest-900 font-semibold">Admin</b> &rsaquo; Organisations</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Toutes les organisations</h1>
      <p className="text-[12.5px] text-gray-500 mb-5">
        {counts.total} organisations &mdash; {counts.byType.cabinet} cabinets, {counts.byType.client} clients
        {counts.byType.groupe > 0 && `, ${counts.byType.groupe} groupes`}
        {counts.byType.platform > 0 && `, ${counts.byType.platform} plateforme`}
        {counts.byType.autre > 0 && `, ${counts.byType.autre} autres`}
        {' · '}{counts.active} actives, {counts.suspended} suspendues.
      </p>

      <div className="flex items-center gap-3 mb-3 flex-wrap">
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
        <FilterPill label={`Actives · ${counts.active}`} active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} variant="green" />
        <FilterPill label={`Suspendues · ${counts.suspended}`} active={statusFilter === 'suspended'} onClick={() => setStatusFilter('suspended')} variant="warn" />
        <FilterPill label={`Toutes · ${counts.total}`} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} variant="gray" />
        <button
          onClick={() => setWizardOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 bg-forest-700 text-white rounded-lg text-[12.5px] font-semibold hover:bg-forest-900"
        >
          <Plus size={14} />
          Onboarder un cabinet
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[10.5px] uppercase tracking-wider text-gray-400 font-semibold">Type :</span>
        <TypePill label="Tous" active={typeFilter === 'all'} count={counts.total} onClick={() => setTypeFilter('all')} variant="gray" />
        <TypePill label="Cabinets" active={typeFilter === 'cabinet'} count={counts.byType.cabinet} onClick={() => setTypeFilter('cabinet')} variant="forest" />
        <TypePill label="Clients" active={typeFilter === 'client'} count={counts.byType.client} onClick={() => setTypeFilter('client')} variant="blue" />
        {counts.byType.groupe > 0 && <TypePill label="Groupes" active={typeFilter === 'groupe'} count={counts.byType.groupe} onClick={() => setTypeFilter('groupe')} variant="gold" />}
        {counts.byType.platform > 0 && <TypePill label="Plateforme" active={typeFilter === 'platform'} count={counts.byType.platform} onClick={() => setTypeFilter('platform')} variant="purple" />}
        {counts.byType.autre > 0 && <TypePill label="Autres" active={typeFilter === 'autre'} count={counts.byType.autre} onClick={() => setTypeFilter('autre')} variant="gray" />}
      </div>

      {wizardOpen && (
        <CreateCabinetWizard onClose={() => setWizardOpen(false)} onCreated={refetch} />
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-page-bg text-[10.5px] uppercase tracking-wider text-gray-300 font-semibold">
              <th className="text-left px-4 py-3 border-b border-gray-200">Organisation</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Type</th>
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
              <tr><td colSpan={8} className="text-center py-10 text-gray-300 text-[12px]">Aucune organisation ne correspond.</td></tr>
            ) : (
              filtered.map((c) => <OrganizationRow key={c.id} org={c} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OrganizationRow({ org }: { org: AdminCabinet }) {
  const orgType = classifyType(org.types)
  const typeMeta = TYPE_LABELS[orgType]

  return (
    <tr className="hover:bg-page-bg">
      <td className="px-4 py-3 border-b border-gray-100">
        <Link to={`/admin/cabinets/${org.id}`} className="flex items-center gap-2.5 hover:opacity-80">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-extrabold flex-shrink-0 ${org.is_active ? 'bg-forest-100 text-forest-700' : 'bg-red-50 text-red-600'}`}>
            {org.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-[13px]">{org.name}</div>
            <div className="text-[11px] text-gray-300">{org.slug}</div>
          </div>
        </Link>
      </td>
      <td className="px-4 py-3 border-b border-gray-100">
        {typeMeta ? <Pill text={typeMeta.label} variant={typeMeta.variant} /> : <span className="text-gray-300 text-[11px]">—</span>}
      </td>
      <td className="px-4 py-3 border-b border-gray-100">{org.plan_name ? <Pill text={org.plan_name} variant="gold" /> : <span className="text-gray-300 text-[11px]">—</span>}</td>
      <td className="px-4 py-3 border-b border-gray-100">{org.members_count}</td>
      <td className="px-4 py-3 border-b border-gray-100">{org.missions_count > 0 ? org.missions_count : <span className="text-gray-300">—</span>}</td>
      <td className="px-4 py-3 border-b border-gray-100 text-[12px] text-gray-500">{formatRelative(org.last_activity_at)}</td>
      <td className="px-4 py-3 border-b border-gray-100">{org.is_active ? <Pill text="Actif" variant="green" /> : <Pill text="Suspendu" variant="red" />}</td>
      <td className="px-4 py-3 border-b border-gray-100 text-right">
        <Link to={`/admin/cabinets/${org.id}`} className="text-forest-700 text-[12px] font-semibold hover:text-forest-900">Détail &rarr;</Link>
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

function TypePill({ label, active, count, onClick, variant }: { label: string; active: boolean; count: number; onClick: () => void; variant: 'forest' | 'blue' | 'gold' | 'purple' | 'gray' }) {
  const ringColor = {
    forest: 'border-forest-300 text-forest-700',
    blue: 'border-blue-300 text-blue-700',
    gold: 'border-gold-300 text-gold-600',
    purple: 'border-purple-300 text-purple-700',
    gray: 'border-gray-300 text-gray-600',
  }[variant]
  const activeBg = {
    forest: 'bg-forest-700 text-white',
    blue: 'bg-blue-600 text-white',
    gold: 'bg-gold-500 text-forest-900',
    purple: 'bg-purple-600 text-white',
    gray: 'bg-gray-700 text-white',
  }[variant]
  return (
    <button type="button" onClick={onClick} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${active ? activeBg : `bg-white border ${ringColor}`}`}>
      {label} <span className="opacity-70">· {count}</span>
    </button>
  )
}

function Pill({ text, variant }: { text: string; variant: 'green' | 'red' | 'gold' | 'gray' | 'forest' | 'blue' | 'purple' }) {
  const map: Record<string, string> = {
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    gold: 'bg-gold-50 text-gold-600',
    gray: 'bg-gray-100 text-gray-500',
    forest: 'bg-forest-100 text-forest-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
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
