/**
 * Export CSV générique côté client (séparateur « ; » + BOM UTF-8 pour Excel FR).
 * La 1re ligne est l'en-tête. Aucune donnée n'est envoyée à un tiers.
 */
export function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>): void {
  const esc = (v: string | number | null | undefined): string => {
    const s = v == null ? '' : String(v)
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const csv = rows.map((r) => r.map(esc).join(';')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
