import { Search } from 'lucide-react'
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

const STATUS_OPTIONS: Array<{ value: ActionPlanFilterState['status']; label: string }> = [
  { value: 'all', label: 'Tous statuts' },
  { value: 'open', label: 'Ouvertes' },
  { value: 'client_responded', label: 'À vérifier' },
  { value: 'verified', label: 'Vérifiées' },
  { value: 'closed', label: 'Clôturées' },
  { value: 'overdue', label: 'En retard' },
]

const CLASS_OPTIONS: Array<{ value: ActionPlanFilterState['classification']; label: string }> = [
  { value: 'all', label: 'Tous types' },
  { value: 'major_nc', label: 'NC majeures' },
  { value: 'minor_nc', label: 'NC mineures' },
  { value: 'observation', label: 'Observations' },
]

export function ActionPlanFilters({ state, onChange }: ActionPlanFiltersProps): JSX.Element {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={state.search}
          onChange={(e) => onChange({ ...state, search: e.target.value })}
          placeholder="Rechercher (code, contrôle, description)…"
          className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg w-80 focus:border-forest-700 focus:ring-1 focus:ring-forest-700"
        />
      </div>
      <select
        value={state.status}
        onChange={(e) => onChange({ ...state, status: e.target.value as ActionPlanFilterState['status'] })}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700"
      >
        {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select
        value={state.classification}
        onChange={(e) => onChange({ ...state, classification: e.target.value as ActionPlanFilterState['classification'] })}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700"
      >
        {CLASS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function applyFilters(cars: ActionPlanCAR[], state: ActionPlanFilterState): ActionPlanCAR[] {
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
