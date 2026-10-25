// Socle partage : schema declaratif des sections d'un document (key + titre +
// chapeau + options). SANS dependance react-pdf, pour que l'editeur de templates
// l'importe sans tirer le moteur PDF. Chaque type de document fournit son propre
// catalogue conforme a ces types (cf. document-catalogs.ts).

export type OptionDef =
  | { key: string; label: string; type: 'toggle'; default: boolean }
  | { key: string; label: string; type: 'number'; default: number; min: number; max: number }

export interface SectionCatalogEntry { key: string; title: string; lead: string; options?: OptionDef[] }

/** Options resolues d'une section : defaut du catalogue + surcharge du template. */
export function resolveOptions(
  catalog: SectionCatalogEntry[], sectionKey: string, templateOptions: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const defs = catalog.find((c) => c.key === sectionKey)?.options ?? []
  const out: Record<string, unknown> = {}
  for (const d of defs) out[d.key] = templateOptions?.[d.key] ?? d.default
  return out
}
