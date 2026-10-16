import { FilterBar } from '../../../components/filters/FilterBar'
import type { FilterDef, FiltersState, FilterOption } from '../../../components/filters/useFilters'
import { getEffectiveClassification, type ActionPlanCAR } from '../../reports/generateActionPlanXLSX'

export interface ActionPlanFilterState {
  status: 'all' | 'open' | 'client_responded' | 'verified' | 'closed' | 'overdue'
  classification: 'all' | 'major_nc' | 'minor_nc' | 'observation'
  search: string
}

interface ActionPlanFiltersProps {
  state: ActionPlanFilterState
  onChange: (state: ActionPlanFilterState) => void
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'open', label: 'Ouvertes' }, { value: 'client_responded', label: 'À vérifier' },
  { value: 'verified', label: 'Vérifiées' }, { value: 'closed', label: 'Clôturées' }, { value: 'overdue', label: 'En retard' },
]
const CLASS_OPTIONS: FilterOption[] = [
  { value: 'major_nc', label: 'NC majeures' }, { value: 'minor_nc', label: 'NC mineures' }, { value: 'observation', label: 'Observations' },
]
const DEFS: FilterDef[] = [
  { key: 'status', label: 'Statut', type: 'select', options: STATUS_OPTIONS },
  { key: 'classification', label: 'Type', type: 'select', options: CLASS_OPTIONS },
]
const labelOf = (opts: FilterOption[], v: string): string => opts.find((o) => o.value === v)?.label ?? v

/** Filtres du plan d'action, migrés vers le standard FilterBar (contrat/applyFilters inchangés). */
export function ActionPlanFilters({ state, onChange }: ActionPlanFiltersProps): JSX.Element {
  const values = {
    status: state.status === 'all' ? '' : state.status,
    classification: state.classification === 'all' ? '' : state.classification,
  }
  const chips = DEFS.filter((d) => values[d.key as 'status' | 'classification'])
    .map((d) => ({ key: d.key, label: `${d.label} : ${labelOf(d.options ?? [], values[d.key as 'status' | 'classification'])}` }))

  const fstate: FiltersState = {
    values,
    set: (k, v) => apply(k, v),
    setAll: (nv) => onChange({ ...state, status: toStatus(nv.status), classification: toClass(nv.classification) }),
    clear: (k) => apply(k, ''),
    reset: () => onChange({ ...state, status: 'all', classification: 'all' }),
    activeCount: chips.length,
    chips,
  }
  function apply(k: string, v: string | boolean | undefined): void {
    if (k === 'status') onChange({ ...state, status: toStatus(v) })
    else if (k === 'classification') onChange({ ...state, classification: toClass(v) })
  }

  return <FilterBar defs={DEFS} state={fstate} search={{ value: state.search, onChange: (s) => onChange({ ...state, search: s }), placeholder: 'Rechercher (code, contrôle, description)...' }} />
}

const toStatus = (v: unknown): ActionPlanFilterState['status'] => (v || 'all') as ActionPlanFilterState['status']
const toClass = (v: unknown): ActionPlanFilterState['classification'] => (v || 'all') as ActionPlanFilterState['classification']

export function applyFilters<T extends ActionPlanCAR>(cars: T[], state: ActionPlanFilterState): T[] {
  const q = state.search.trim().toLowerCase()
  return cars.filter((c) => {
    if (state.classification !== 'all' && getEffectiveClassification(c) !== state.classification) return false
    if (state.status === 'overdue') {
      if (c.status === 'verified' || c.status === 'closed') return false
      const due = c.client_target_date ?? c.deadline
      if (!due || new Date(due).getTime() >= Date.now()) return false
    } else if (state.status !== 'all' && c.status !== state.status) return false
    if (q) {
      const hay = `${c.code} ${c.control_code ?? ''} ${c.control_name ?? ''} ${c.description ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}
