import { useState, useEffect, useCallback } from 'react'
import { getSectionCatalog } from '../reports/document-catalogs'
import type { SectionCatalogEntry } from '../reports/report-kit/catalog'
import type { ReportDocumentType, ReportTemplate, ReportTemplateSection } from '../../types/database.types'
import type { Row } from './TemplateSectionsList'

// Etat des lignes de l'editeur de modele : sections du catalogue + sections libres
// (A2). Extrait du modal pour heberger la logique A2 et tenir la limite de taille.

function buildRows(tpl: ReportTemplate | null | undefined, catalog: SectionCatalogEntry[]): Row[] {
  const byKey = new Map(catalog.map((c) => [c.key, c.title]))
  if (!tpl) return catalog.map((c) => ({ key: c.key, title: c.title, visible: true, options: {} }))
  const rows: Row[] = []
  for (const s of tpl.sections) {
    if (s.kind === 'custom') { rows.push({ key: s.key, title: s.title ?? 'Section', visible: s.visible, options: {}, kind: 'custom', body: s.body ?? '' }); continue }
    const title = byKey.get(s.key)
    if (title) { rows.push({ key: s.key, title, visible: s.visible, options: s.options ?? {} }); byKey.delete(s.key) }
  }
  for (const [key, title] of byKey) rows.push({ key, title, visible: false, options: {} })
  return rows
}

export interface TemplateRowsApi {
  rows: Row[]
  setRows: (rows: Row[]) => void
  toggle: (index: number) => void
  setOption: (index: number, key: string, value: unknown) => void
  setCustomField: (index: number, field: 'title' | 'body', value: string) => void
  addCustom: () => void
  removeCustom: (index: number) => void
  /** Entrees pour l'aperçu live (inclut les sections libres). */
  previewSections: ReportTemplateSection[]
  /** Entrees pour l'enregistrement du modele. */
  serialize: () => ReportTemplateSection[]
}

export function useTemplateRows(template: ReportTemplate | null | undefined, docType: ReportDocumentType): TemplateRowsApi {
  const [rows, setRows] = useState<Row[]>(() => buildRows(template, getSectionCatalog(template?.document_type ?? docType)))

  // Changer de type de document (nouveau modele seulement) recharge le catalogue.
  useEffect(() => {
    if (template) return
    setRows(buildRows(null, getSectionCatalog(docType)))
  }, [docType, template])

  const toggle = useCallback((i: number) => setRows((r) => r.map((row, k) => k === i ? { ...row, visible: !row.visible } : row)), [])
  const setOption = useCallback((i: number, key: string, value: unknown) =>
    setRows((r) => r.map((row, k) => k === i ? { ...row, options: { ...row.options, [key]: value } } : row)), [])
  const setCustomField = useCallback((i: number, field: 'title' | 'body', value: string) =>
    setRows((r) => r.map((row, k) => k === i ? { ...row, [field]: value } : row)), [])
  const addCustom = useCallback(() =>
    setRows((r) => [...r, { key: `custom-${Date.now()}`, title: 'Nouvelle section', visible: true, options: {}, kind: 'custom', body: '' }]), [])
  const removeCustom = useCallback((i: number) => setRows((r) => r.filter((_, k) => k !== i)), [])

  const previewSections: ReportTemplateSection[] = rows.map((r) => r.kind === 'custom'
    ? { key: r.key, visible: r.visible, kind: 'custom', title: r.title, body: r.body ?? '' }
    : { key: r.key, visible: r.visible, options: r.options })

  const serialize = useCallback((): ReportTemplateSection[] => rows.map((r) => r.kind === 'custom'
    ? { key: r.key, visible: r.visible, kind: 'custom', title: r.title.trim() || 'Section', body: (r.body ?? '').trim() }
    : { key: r.key, visible: r.visible, ...(Object.keys(r.options).length ? { options: r.options } : {}) }), [rows])

  return { rows, setRows, toggle, setOption, setCustomField, addCustom, removeCustom, previewSections, serialize }
}
