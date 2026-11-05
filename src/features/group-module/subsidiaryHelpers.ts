import type { FilterDef } from '../../components/filters/useFilters'
import { CRITICALITY_OPTIONS, REGUL_ENTITY_TYPE_OPTIONS, ENTITY_TYPE_OPTIONS } from '../../lib/constants'
import type { SubsidiaryRow } from './useSubsidiaries'

/**
 * Filtres déclaratifs du registre (standard plateforme), conditionnés au produit
 * pour préserver le partage Comply/Regul : la Criticité (IIC) n'existe qu'en Regul.
 */
export function buildSubsidiaryFilterDefs(isRegul: boolean): FilterDef[] {
  const defs: FilterDef[] = []
  if (isRegul) defs.push({ key: 'criticality', label: 'Criticité', type: 'select', options: [...CRITICALITY_OPTIONS] })
  defs.push({ key: 'nature', label: 'Nature', type: 'select', options: isRegul ? [...REGUL_ENTITY_TYPE_OPTIONS] : [...ENTITY_TYPE_OPTIONS] })
  defs.push({ key: 'overdue', label: 'Plans d’action en retard', type: 'toggle' })
  return defs
}

/**
 * Construit un résolveur des descendants d'une entité (parcours du graphe
 * parent → enfants), pour exclure les cycles du select « rattachée à ».
 */
export function buildDescendantsResolver(subsidiaries: SubsidiaryRow[]): (rootId: string) => Set<string> {
  const children = new Map<string, string[]>()
  for (const s of subsidiaries) {
    if (!s.parentOrgId) continue
    const arr = children.get(s.parentOrgId) ?? []
    arr.push(s.id); children.set(s.parentOrgId, arr)
  }
  return (rootId: string): Set<string> => {
    const out = new Set<string>()
    const stack = [rootId]
    while (stack.length) {
      const id = stack.pop()!
      for (const c of children.get(id) ?? []) { if (!out.has(c)) { out.add(c); stack.push(c) } }
    }
    return out
  }
}
