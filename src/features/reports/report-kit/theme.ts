// Socle partage des documents react-pdf (RFC 0021 E2). Thematique generique :
// charte derivee des couleurs cabinet, resolution de libelles surcharges par
// template, reference de document deterministe. AUCUNE dependance a un document
// particulier (rapport d'audit, note de cadrage, CR d'entretien...).

export interface ReportTheme {
  primary: string
  accent: string
  ink: string
  muted: string
  surface: string
  border: string
  onPrimary: string
}

/** Charte derivee des couleurs de marque (hex #RRGGBB), repli sur la charte Gestu. */
export function buildTheme(primaryColor: string | null, accentColor: string | null): ReportTheme {
  const hex = (v: string | null, fb: string): string => (v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fb)
  return {
    primary: hex(primaryColor, '#1B4332'),
    accent: hex(accentColor, '#D4A843'),
    ink: '#1a2e23',
    muted: '#6b7280',
    surface: '#ffffff',
    border: '#e5e7eb',
    onPrimary: '#ffffff',
  }
}

/** Libelle surcharge par le template sinon le defaut integre. */
export function resolveText(texts: Record<string, string> | null | undefined, key: string, fallback: string): string {
  const v = texts?.[key]
  return v && v.trim().length > 0 ? v : fallback
}

/** Reference de document deterministe (PREFIXE-AAAA-NNN), stable pour un id donne. */
export function computeDocRef(prefix: string, id: string, date: string | null | undefined): string {
  const year = date ? new Date(date).getFullYear() : new Date().getFullYear()
  let h = 0
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
  const seq = Math.abs(h) % 1000
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`
}
