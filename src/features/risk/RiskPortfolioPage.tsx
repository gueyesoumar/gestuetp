import { useMemo, useState } from 'react'
import { Network, ChevronDown, ChevronRight } from 'lucide-react'
import { useVocab } from '../edition/useVocab'
import { useSupervisedPortfolio, type PortfolioOrg } from './useSupervisedPortfolio'
import { useSupervisionAssignments } from './useSupervisionAssignments'
import { useSupervisorDirectives } from './useSupervisorDirectives'
import { useCabinetPermissions } from '../../hooks/useCabinetPermissions'
import { uncoveredOrgs } from './supervisionCoverage'
import { attentionScore } from './riskAttention'
import { SupervisedOrgRisks } from './SupervisedOrgRisks'
import { RiskSectorRadar } from './RiskSectorRadar'
import { AttentionList } from './AttentionList'
import { DirectivesPanel } from './DirectivesPanel'
import { CoveragePanel } from './CoveragePanel'
import { PortfolioTable } from './PortfolioTable'
import { useFilters, type FilterDef } from '../../components/filters/useFilters'
import { FilterBar } from '../../components/filters/FilterBar'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { EmptyState } from '../../components/ui/EmptyState'

/** Cockpit de supervision : quels assujettis demandent une action (RFC 0018 Lot B). */
export function RiskPortfolioPage(): JSX.Element {
  const vocab = useVocab()
  const { orgs, loading, error } = useSupervisedPortfolio()
  const { assignments } = useSupervisionAssignments()
  const { rows: directives } = useSupervisorDirectives()
  const { canManageSupervisionAssignments } = useCabinetPermissions()
  const [selected, setSelected] = useState<PortfolioOrg | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [search, setSearch] = useState('')

  const entityCap = vocab.entitySingular.charAt(0).toUpperCase() + vocab.entitySingular.slice(1)
  const sectors = useMemo(() => [...new Set(orgs.map((o) => o.sector).filter(Boolean) as string[])].sort(), [orgs])
  const filterDefs: FilterDef[] = useMemo(() => [
    { key: 'entite', label: entityCap, type: 'select', options: [...orgs].sort((a, b) => a.org_name.localeCompare(b.org_name)).map((o) => ({ value: o.organization_id, label: o.org_name })) },
    { key: 'secteur', label: 'Secteur', type: 'select', options: sectors.map((s) => ({ value: s, label: s })) },
    { key: 'type', label: 'Type', type: 'select', options: [{ value: 'vitale', label: 'Vitale (IIC)' }, { value: 'standard', label: 'Standard' }] },
  ], [orgs, sectors, entityCap])
  const filters = useFilters(filterDefs)

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orgs.filter((o) => {
      if (q && !o.org_name.toLowerCase().includes(q)) return false
      if (filters.values.entite && o.organization_id !== filters.values.entite) return false
      if (filters.values.secteur && o.sector !== filters.values.secteur) return false
      if (filters.values.type === 'vitale' && !o.is_iic) return false
      if (filters.values.type === 'standard' && o.is_iic) return false
      return true
    })
  }, [orgs, search, filters.values])

  const uncovered = useMemo(() => uncoveredOrgs(orgs, assignments), [orgs, assignments])
  const uncoveredSet = useMemo(() => new Set(uncovered.map((o) => o.organization_id)), [uncovered])
  const shownSet = useMemo(() => new Set(shown.map((o) => o.organization_id)), [shown])
  const uncoveredShown = useMemo(() => uncovered.filter((o) => shownSet.has(o.organization_id)), [uncovered, shownSet])
  const priority = useMemo(
    () => [...shown].sort((a, b) => attentionScore(b, uncoveredSet.has(b.organization_id)) - attentionScore(a, uncoveredSet.has(a.organization_id))).slice(0, 6),
    [shown, uncoveredSet],
  )

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />
  if (selected) return <SupervisedOrgRisks org={selected} onBack={() => setSelected(null)} />

  const totals = {
    iic: shown.filter((o) => o.is_iic).length,
    above: shown.reduce((s, o) => s + o.above_threshold, 0),
    overdue: shown.reduce((s, o) => s + o.overdue_reviews, 0),
    pending: shown.reduce((s, o) => s + o.pending_directives, 0),
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Network size={20} className="text-[#E07A5F]" /> Cockpit de supervision</h1>
        <p className="mt-1 text-[13px] text-gray-500">Quels {vocab.entityPlural} demandent votre attention aujourd&apos;hui.</p>
      </div>

      {orgs.length === 0 ? (
        <EmptyState title={`Aucun ${vocab.entitySingular} supervisé`} description="Vous n'avez pas de mission active vous donnant accès au registre de risque d'une autre organisation." />
      ) : (
        <>
          <FilterBar defs={filterDefs} state={filters} search={{ value: search, onChange: setSearch, placeholder: `Rechercher un ${vocab.entitySingular}...` }} />

          {shown.length === 0 ? (
            <p className="text-[13px] text-gray-400 px-1">Aucun {vocab.entitySingular} ne correspond aux filtres.</p>
          ) : (
          <>
          <div className={`grid grid-cols-2 gap-3 ${canManageSupervisionAssignments ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
            <Kpi value={shown.length} label={vocab.entitiesTitle} sub={`dont ${totals.iic} IIC`} />
            <Kpi value={totals.above} label="Hors seuil" tone={totals.above > 0 ? 'text-red-600' : undefined} />
            <Kpi value={totals.overdue} label="Revues en retard" tone={totals.overdue > 0 ? 'text-red-600' : undefined} />
            <Kpi value={totals.pending} label="Demandes en cours" tone={totals.pending > 0 ? 'text-amber-600' : undefined} />
            {canManageSupervisionAssignments && <Kpi value={uncoveredShown.length} label="Sans responsable" tone={uncoveredShown.length > 0 ? 'text-amber-600' : undefined} />}
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Cartographie du risque</h3>
              <RiskSectorRadar orgs={shown} />
            </div>
            <div className="space-y-5">
              <DirectivesPanel rows={directives} />
              {canManageSupervisionAssignments && <CoveragePanel total={shown.length} uncovered={uncoveredShown} canManage />}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="px-4 py-3 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">À traiter en priorité</h3><p className="text-[11.5px] text-gray-500 mt-0.5">Les infrastructures vitales hors seuil remontent en tête.</p></div>
            <AttentionList items={priority} uncovered={uncoveredSet} onSelect={setSelected} />
          </div>

          <button onClick={() => setShowAll((v) => !v)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest-700 hover:text-forest-900">
            {showAll ? <ChevronDown size={16} /> : <ChevronRight size={16} />} Tout le portefeuille ({shown.length})
          </button>
          {showAll && <PortfolioTable orgs={shown} onSelect={setSelected} />}
          </>
          )}
        </>
      )}
    </div>
  )
}

function Kpi({ value, label, tone, sub }: { value: number; label: string; tone?: string; sub?: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className={`text-2xl font-bold ${tone ?? 'text-gray-900'}`}>{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
      {sub && <p className="text-[10.5px] text-[#C08A1E] font-semibold mt-0.5">{sub}</p>}
    </div>
  )
}
