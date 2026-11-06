import {
  ENTITY_TYPE_OPTIONS, REGUL_ENTITY_TYPE_OPTIONS, CRITICALITY_OPTIONS, PAYS_OPTIONS,
} from '../../lib/constants'
import type { EntityInput } from './useManageEntity'

/** Colonne du modèle d'import des assujettis / entités. */
interface Col {
  key: keyof EntityInput
  header: string
  required?: boolean
  kind: 'text' | 'enum' | 'sector' | 'date'
  options?: ReadonlyArray<{ value: string; label: string }>
  example?: string
}

type Opts = { isRegul: boolean; sectorLabels: string[] }

function columns(isRegul: boolean): Col[] {
  const base: Col[] = [
    { key: 'name', header: 'Nom', required: true, kind: 'text', example: isRegul ? 'Ministère de la Santé' : 'Filiale Dakar' },
    { key: 'entity_type', header: 'Type', required: true, kind: 'enum', options: isRegul ? REGUL_ENTITY_TYPE_OPTIONS : ENTITY_TYPE_OPTIONS, example: isRegul ? 'Ministère' : 'Filiale' },
    { key: 'sector', header: 'Secteur', kind: 'sector', example: 'Santé publique' },
    { key: 'city', header: 'Ville', kind: 'text', example: 'Dakar' },
    { key: 'country', header: 'Pays', kind: 'enum', options: PAYS_OPTIONS.map((p) => ({ value: p, label: p })), example: 'Sénégal' },
  ]
  if (!isRegul) return base
  return [...base,
    { key: 'criticality', header: 'Criticité', kind: 'enum', options: CRITICALITY_OPTIONS, example: 'Standard' },
    { key: 'obligation_regime', header: "Régime d'obligations", kind: 'text', example: '' },
    { key: 'tier', header: 'Palier', kind: 'text', example: 'Niveau 1' },
    { key: 'entry_date', header: "Date d'entrée (AAAA-MM-JJ)", kind: 'date', example: '2026-01-15' },
  ]
}

const norm = (s: string): string => s.replace(/\*/g, '').trim().toLowerCase()
function matchEnum(value: string, options: ReadonlyArray<{ value: string; label: string }>): string | null {
  const v = norm(value)
  const o = options.find((x) => norm(x.label) === v || norm(x.value) === v)
  return o ? o.value : null
}

export interface ParsedEntityRow {
  rowNumber: number
  name: string
  data: EntityInput | null
  errors: string[]
}

function downloadBlob(buf: ArrayBuffer, filename: string): void {
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

/** Génère et télécharge le modèle XLSX (en-têtes + exemple + listes déroulantes + feuille d'aide). */
export async function downloadEntityTemplate(opts: Opts & { sheetName: string; filename: string }): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const cols = columns(opts.isRegul)
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(opts.sheetName.slice(0, 28))
  ws.columns = cols.map((c) => ({ header: c.required ? `${c.header} *` : c.header, key: c.key as string, width: Math.max(16, c.header.length + 4) }))
  ws.addRow(Object.fromEntries(cols.map((c) => [c.key, c.example ?? ''])))
  const head = ws.getRow(1)
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4332' } }
  cols.forEach((c, i) => {
    let list: string[] | null = null
    if (c.kind === 'enum' && c.options) list = c.options.map((o) => o.label)
    if (c.kind === 'sector' && opts.sectorLabels.length) list = opts.sectorLabels
    if (!list) return
    const formula = `"${list.join(',').replace(/"/g, '')}"`
    if (formula.length > 255) return // limite Excel : on laisse le champ libre
    const letter = ws.getColumn(i + 1).letter
    for (let r = 2; r <= 200; r++) {
      ws.getCell(`${letter}${r}`).dataValidation = { type: 'list', allowBlank: !c.required, formulae: [formula], showErrorMessage: !!c.required }
    }
  })
  const info = wb.addWorksheet('Instructions')
  info.columns = [{ header: 'Colonne', width: 26 }, { header: 'Obligatoire', width: 12 }, { header: 'Valeurs acceptées', width: 70 }]
  info.getRow(1).font = { bold: true }
  cols.forEach((c) => {
    const vals = c.kind === 'enum' && c.options ? c.options.map((o) => o.label).join(', ')
      : c.kind === 'sector' ? (opts.sectorLabels.join(', ') || 'Texte libre')
      : c.kind === 'date' ? 'Date au format AAAA-MM-JJ' : 'Texte libre'
    info.addRow([c.header, c.required ? 'Oui' : 'Non', vals])
  })
  downloadBlob(await wb.xlsx.writeBuffer() as ArrayBuffer, opts.filename)
}

/** Lit un fichier XLSX rempli et valide chaque ligne (parsing 100 % navigateur). */
export async function parseEntitiesFile(file: File, opts: Opts): Promise<ParsedEntityRow[]> {
  const ExcelJS = (await import('exceljs')).default
  const cols = columns(opts.isRegul)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ws = wb.worksheets[0]
  if (!ws) return []

  const keyByCol: Record<number, Col> = {}
  ws.getRow(1).eachCell((cell, col) => {
    const h = norm(String(cell.text ?? ''))
    const match = cols.find((c) => norm(c.header) === h) ?? cols.find((c) => h.startsWith(norm(c.header)) || norm(c.header).startsWith(h))
    if (match) keyByCol[col] = match
  })

  const cellText = (cell: { value: unknown; text?: string }): string => {
    const v = cell.value
    if (v == null) return ''
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    if (typeof v === 'object') {
      const o = v as Record<string, unknown>
      if (typeof o.text === 'string') return o.text.trim()
      if (o.result != null) return String(o.result).trim()
      return String(cell.text ?? '').trim()
    }
    return String(v).trim()
  }

  const rows: ParsedEntityRow[] = []
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    const raw: Partial<Record<keyof EntityInput, string>> = {}
    let any = false
    row.eachCell((cell, col) => {
      const c = keyByCol[col]; if (!c) return
      const t = cellText(cell as { value: unknown; text?: string })
      if (t) any = true
      raw[c.key] = t
    })
    if (!any) continue
    rows.push(validate(raw, cols, opts.isRegul, r))
  }
  return rows
}

function validate(raw: Partial<Record<keyof EntityInput, string>>, cols: Col[], isRegul: boolean, rowNumber: number): ParsedEntityRow {
  const errors: string[] = []
  const name = (raw.name ?? '').trim()
  if (!name) errors.push('Nom requis')

  const typeRaw = (raw.entity_type ?? '').trim()
  const typeCol = cols.find((c) => c.key === 'entity_type')!
  let entity_type: string | null = null
  if (!typeRaw) errors.push('Type requis')
  else { entity_type = matchEnum(typeRaw, typeCol.options!); if (!entity_type) errors.push(`Type inconnu : ${typeRaw}`) }

  let criticality: 'eleve' | 'standard' | undefined
  if (isRegul) {
    const cr = (raw.criticality ?? '').trim()
    if (!cr) criticality = 'standard'
    else { const m = matchEnum(cr, CRITICALITY_OPTIONS); if (m === 'eleve' || m === 'standard') criticality = m; else errors.push(`Criticité inconnue : ${cr}`) }
  }

  let entry_date: string | null | undefined
  const ed = (raw.entry_date ?? '').trim()
  if (ed) { if (/^\d{4}-\d{2}-\d{2}$/.test(ed)) entry_date = ed; else errors.push(`Date invalide : ${ed} (AAAA-MM-JJ)`) }

  const data: EntityInput | null = errors.length ? null : {
    name,
    entity_type: entity_type as EntityInput['entity_type'],
    sector: (raw.sector ?? '').trim() || null,
    city: (raw.city ?? '').trim() || null,
    country: (raw.country ?? '').trim() || null,
    ...(isRegul ? {
      criticality,
      obligation_regime: (raw.obligation_regime ?? '').trim() || null,
      tier: (raw.tier ?? '').trim() || null,
      reg_status: 'active' as const,
      entry_date: entry_date ?? null,
    } : {}),
  }
  return { rowNumber, name: name || '(sans nom)', data, errors }
}
