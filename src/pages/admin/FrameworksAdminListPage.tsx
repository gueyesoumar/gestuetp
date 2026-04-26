import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Sparkles } from 'lucide-react'
import { useAdminFrameworks, type AdminFrameworkRow } from '../../features/admin/useAdminFrameworks'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { FrameworkAiDraftWizard } from '../../features/admin/FrameworkAiDraftWizard'

type StatusFilter = 'all' | 'active' | 'inactive'

export function FrameworksAdminListPage() {
  const { frameworks, loading, error, refetch } = useAdminFrameworks()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [wizardOpen, setWizardOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return frameworks.filter((f) => {
      if (statusFilter === 'active' && !f.is_active) return false
      if (statusFilter === 'inactive' && f.is_active) return false
      if (q && !f.name.toLowerCase().includes(q) && !f.slug.toLowerCase().includes(q)) return false
      return true
    })
  }, [frameworks, search, statusFilter])

  const counts = useMemo(() => ({
    active: frameworks.filter((f) => f.is_active).length,
    inactive: frameworks.filter((f) => !f.is_active).length,
  }), [frameworks])

  if (loading) return <div className="p-8"><LoadingSpinner /></div>
  if (error) return <div className="p-8"><ErrorAlert message={error} /></div>

  return (
    <div className="px-7 py-6">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[11.5px] text-gray-500"><b className="text-forest-900 font-semibold">Admin</b> &rsaquo; Référentiels</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Référentiels</h1>
      <p className="text-[12.5px] text-gray-500 mb-5">Création / édition des référentiels et de leurs contrôles. Création manuelle ou assistée par IA.</p>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer par nom ou slug…"
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[12.5px] w-72 bg-page-bg"
          />
        </div>
        <FilterPill label={`Tous · ${frameworks.length}`} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        <FilterPill label={`Actifs · ${counts.active}`} active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} variant="green" />
        {counts.inactive > 0 && <FilterPill label={`Désactivés · ${counts.inactive}`} active={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')} variant="gray" />}
        <button
          onClick={() => setWizardOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 bg-gold-500 text-forest-900 rounded-lg text-[12.5px] font-bold hover:bg-gold-600"
        >
          <Sparkles size={14} />
          Générer avec IA
        </button>
        <Link
          to="/admin/frameworks/nouveau"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-forest-700 text-white rounded-lg text-[12.5px] font-semibold hover:bg-forest-900"
        >
          <Plus size={14} />
          Nouveau (manuel)
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center text-[12.5px] text-gray-300">
          Aucun référentiel ne correspond.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-page-bg text-[10.5px] uppercase tracking-wider text-gray-300 font-semibold">
                <th className="text-left px-4 py-3 border-b border-gray-200">Référentiel</th>
                <th className="text-left px-4 py-3 border-b border-gray-200">Catégorie</th>
                <th className="text-right px-4 py-3 border-b border-gray-200">Domaines</th>
                <th className="text-right px-4 py-3 border-b border-gray-200">Contrôles</th>
                <th className="text-right px-4 py-3 border-b border-gray-200">Missions</th>
                <th className="text-left px-4 py-3 border-b border-gray-200">Statut</th>
                <th className="px-4 py-3 border-b border-gray-200" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => <Row key={f.id} framework={f} />)}
            </tbody>
          </table>
        </div>
      )}

      {wizardOpen && (
        <FrameworkAiDraftWizard onClose={() => setWizardOpen(false)} onCreated={refetch} />
      )}
    </div>
  )
}

function Row({ framework }: { framework: AdminFrameworkRow }) {
  return (
    <tr className="hover:bg-page-bg">
      <td className="px-4 py-3 border-b border-gray-100">
        <Link to={`/admin/frameworks/${framework.slug}`} className="hover:opacity-80">
          <div className="font-semibold text-gray-900 text-[13px]">
            {framework.name}
            {framework.was_ai_generated && (
              <span className="ml-2 inline-flex items-center gap-1 text-[9.5px] uppercase tracking-wider font-bold bg-gold-50 text-gold-600 px-1.5 py-0.5 rounded">
                <Sparkles size={9} /> Brouillon IA
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-300">
            {framework.slug}{framework.version && ` · v${framework.version}`}{framework.publisher && ` · ${framework.publisher}`}
          </div>
        </Link>
      </td>
      <td className="px-4 py-3 border-b border-gray-100"><span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">{framework.category}</span></td>
      <td className="px-4 py-3 border-b border-gray-100 text-right">{framework.domains_count}</td>
      <td className="px-4 py-3 border-b border-gray-100 text-right">{framework.controls_count}</td>
      <td className="px-4 py-3 border-b border-gray-100 text-right">{framework.missions_count > 0 ? <span className="font-semibold">{framework.missions_count}</span> : <span className="text-gray-300">0</span>}</td>
      <td className="px-4 py-3 border-b border-gray-100">
        {framework.is_active
          ? <span className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">Actif</span>
          : <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">Désactivé</span>}
      </td>
      <td className="px-4 py-3 border-b border-gray-100 text-right">
        <Link to={`/admin/frameworks/${framework.slug}`} className="text-forest-700 text-[12px] font-semibold hover:text-forest-900">Éditer &rarr;</Link>
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
