import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import { useAdminCabinets, type AdminCabinet } from '../../features/admin/useAdminCabinets'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { CreateCabinetWizard } from '../../features/admin/CreateCabinetWizard'
import { KpiTile } from '../../features/admin/dashboard/KpiTile'
import { bandLabel } from '../../features/hub/trustBand'

type StatusFilter = 'all' | 'active' | 'suspended'
type NatureFilter = 'all' | 'cabinet' | 'regulator' | 'client' | 'group' | 'platform' | 'autre'

const NATURE_LABELS: Record<string, { label: string; variant: 'forest' | 'blue' | 'gold' | 'purple' | 'gray' | 'red' }> = {
  cabinet: { label: 'Cabinet', variant: 'forest' },
  regulator: { label: 'Régulateur', variant: 'red' },
  client: { label: 'Client', variant: 'blue' },
  group: { label: 'Groupe', variant: 'gold' },
  platform: { label: 'Plateforme', variant: 'purple' },
}

function natureOf(org: AdminCabinet): NatureFilter {
  if (org.types.includes('cabinet')) return 'cabinet'
  if (org.is_regulator) return 'regulator'
  if (org.types.includes('client')) return 'client'
  if (org.types.includes('group')) return 'group'
  if (org.types.includes('platform')) return 'platform'
  return 'autre'
}

export function CabinetsListPage() {
  const { cabinets, loading, error, refetch } = useAdminCabinets()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<NatureFilter>('all')
  const [wizardOpen, setWizardOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = cabinets.filter((c) => {
      if (statusFilter === 'active' && !c.is_active) return false
      if (statusFilter === 'suspended' && c.is_active) return false
      if (typeFilter !== 'all' && natureOf(c) !== typeFilter) return false
      if (q && !c.name.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q)) return false
      return true
    })
    // Tri « à risque en premier » : posture croissante, non évaluées (null) en fin.
    return rows.sort((a, b) => {
      if (a.posture === null && b.posture === null) return 0
      if (a.posture === null) return 1
      if (b.posture === null) return -1
      return a.posture - b.posture
    })
  }, [cabinets, search, statusFilter, typeFilter])

  const counts = useMemo(() => {
    const byType: Record<string, number> = { cabinet: 0, regulator: 0, client: 0, group: 0, platform: 0, autre: 0 }
    let active = 0
    let suspended = 0
    for (const c of cabinets) {
      byType[natureOf(c)]++
      if (c.is_active) active++; else suspended++
    }
    return { byType, active, suspended, total: cabinets.length }
  }, [cabinets])

  if (loading) return <div className="p-8"><LoadingSpinner /></div>
  if (error) return <div className="p-8"><ErrorAlert message={error} /></div>

  return (
    <div className="px-7 py-6">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[11.5px] text-gray-500"><b className="text-forest-900 font-semibold">Admin</b> › Organisations</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Toutes les organisations</h1>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 mb-5">
        <KpiTile label="Total" value={counts.total.toString()} sub={`${counts.active} actives · ${counts.suspended} susp.`} accent="gold" />
        <KpiTile label="Cabinets" value={counts.byType.cabinet.toString()} accent="green" />
        <KpiTile label="Régulateurs" value={counts.byType.regulator.toString()} accent="gold" />
        <KpiTile label="Groupes" value={counts.byType.group.toString()} accent="gold" />
        <KpiTile label="Clients" value={counts.byType.client.toString()} accent="blue" />
        <KpiTile label="Plateforme" value={counts.byType.platform.toString()} accent="purple" />
      </div>

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
        <span className="text-[10.5px] uppercase tracking-wider text-gray-400 font-semibold">Nature :</span>
        <TypePill label="Toutes" active={typeFilter === 'all'} count={counts.total} onClick={() => setTypeFilter('all')} variant="gray" />
        <TypePill label="Cabinets" active={typeFilter === 'cabinet'} count={counts.byType.cabinet} onClick={() => setTypeFilter('cabinet')} variant="forest" />
        {counts.byType.regulator > 0 && <TypePill label="Régulateurs" active={typeFilter === 'regulator'} count={counts.byType.regulator} onClick={() => setTypeFilter('regulator')} variant="gold" />}
        <TypePill label="Clients" active={typeFilter === 'client'} count={counts.byType.client} onClick={() => setTypeFilter('client')} variant="blue" />
        {counts.byType.group > 0 && <TypePill label="Groupes" active={typeFilter === 'group'} count={counts.byType.group} onClick={() => setTypeFilter('group')} variant="gold" />}
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
              <th className="text-left px-4 py-3 border-b border-gray-200">Nature</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Plan</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Conformité</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Membres</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Missions</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Dernière activité</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Statut</th>
              <th className="px-4 py-3 border-b border-gray-200" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-300 text-[12px]">Aucune organisation ne correspond.</td></tr>
            ) : (
              filtered.map((c) => <OrganizationRow key={c.id} org={c} />)
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11.5px] text-gray-400 leading-relaxed">
        <b className="text-gray-500">Conformité</b> = posture moyenne des axes mesurés (part des contrôles approuvés), triée à risque en premier.
        Les clients &amp; assujettis apparaissent «&nbsp;Non évalué&nbsp;» : leur conformité est portée par les missions de leur organisation mère.
      </p>
    </div>
  )
}

function OrganizationRow({ org }: { org: AdminCabinet }) {
  const typeMeta = NATURE_LABELS[natureOf(org)]

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
      <td className="px-4 py-3 border-b border-gray-100"><PostureCell score={org.posture} /></td>
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

function PostureCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-300 text-[11px]">Non évalué</span>
  const variant: 'green' | 'gold' | 'red' = score >= 80 ? 'green' : score >= 60 ? 'gold' : 'red'
  const dot = { green: 'bg-green-500', gold: 'bg-gold-500', red: 'bg-red-500' }[variant]
  const text = { green: 'text-green-700', gold: 'text-gold-600', red: 'text-red-700' }[variant]
  return (
    <span className="inline-flex items-center gap-2" title={bandLabel(score)}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      <span className={`text-[12.5px] font-bold tabular-nums ${text}`}>{score}%</span>
    </span>
  )
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
