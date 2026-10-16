import { useCallback, useMemo, useState } from 'react'

/** Standard de filtrage de la plateforme (RFC UX) : un hook + <FilterBar>, pilotés
 *  par une config déclarative, pour que TOUS les filtres (existants et à venir) aient
 *  la même UI (un seul bouton « Filtres »). Le filtrage des données reste côté écran. */
export type FilterType = 'select' | 'toggle'

export interface FilterOption { value: string; label: string }

export interface FilterDef {
  key: string
  label: string
  type: FilterType
  /** Options pour `select`. */
  options?: FilterOption[]
}

export type FilterValues = Record<string, string | boolean | undefined>

export interface FilterChip { key: string; label: string }

const isActive = (def: FilterDef, v: FilterValues[string]): boolean =>
  def.type === 'toggle' ? v === true : typeof v === 'string' && v !== ''

const chipLabel = (def: FilterDef, v: FilterValues[string]): string => {
  if (def.type === 'toggle') return def.label
  const opt = def.options?.find((o) => o.value === v)
  return `${def.label} : ${opt?.label ?? String(v)}`
}

export interface FiltersState {
  values: FilterValues
  set: (key: string, value: string | boolean | undefined) => void
  setAll: (values: FilterValues) => void
  clear: (key: string) => void
  reset: () => void
  activeCount: number
  chips: FilterChip[]
}

export function useFilters(defs: FilterDef[], initial: FilterValues = {}): FiltersState {
  const [values, setValues] = useState<FilterValues>(initial)
  const set = useCallback((key: string, value: string | boolean | undefined) => setValues((s) => ({ ...s, [key]: value })), [])
  const setAll = useCallback((v: FilterValues) => setValues(v), [])
  const clear = useCallback((key: string) => setValues((s) => { const n = { ...s }; delete n[key]; return n }), [])
  const reset = useCallback(() => setValues({}), [])

  const { activeCount, chips } = useMemo(() => {
    const active = defs.filter((d) => isActive(d, values[d.key]))
    return { activeCount: active.length, chips: active.map((d) => ({ key: d.key, label: chipLabel(d, values[d.key]) })) }
  }, [defs, values])

  return { values, set, setAll, clear, reset, activeCount, chips }
}
