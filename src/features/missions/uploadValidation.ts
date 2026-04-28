/**
 * Validation côté client AVANT envoi vers Supabase + Anthropic.
 *
 * Source de vérité pour :
 *   - les extensions acceptées (UI input accept=, dropzone, pre-upload check)
 *   - la taille max par fichier (32 Mo natif Anthropic Files API)
 *   - le message d'erreur précis renvoyé à l'utilisateur (au lieu d'un
 *     échec serveur tardif)
 */

export const MAX_FILE_SIZE_BYTES = 32 * 1024 * 1024 // 32 Mo (limite Anthropic Files API)
export const MAX_FILE_SIZE_LABEL = '32 Mo'

/**
 * Extensions acceptées sur l'input HTML <input accept="…">.
 * Doit rester synchro avec ACCEPTED_FORMATS.
 */
export const ACCEPT_ATTR = '.pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.html,.htm,.png,.jpg,.jpeg,.webp'

interface FormatSpec {
  label: string
  extensions: string[]
  /** Si null, le serveur convertira ou enverra natif. Sinon raison de rejet. */
  unsupported?: string
}

export const ACCEPTED_FORMATS: FormatSpec[] = [
  { label: 'PDF',  extensions: ['pdf'] },
  { label: 'Word', extensions: ['docx', 'doc'] },
  { label: 'Excel', extensions: ['xlsx', 'xls'] },
  { label: 'CSV / TXT / HTML', extensions: ['csv', 'txt', 'html', 'htm'] },
  { label: 'Image', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
]

/** Liste plate des extensions, en lower case. */
const ALL_EXTS: Set<string> = new Set(
  ACCEPTED_FORMATS.flatMap((f) => f.extensions),
)

export interface ValidationFailure {
  fileName: string
  reason: string
}

export interface ValidationResult {
  ok: File[]
  failures: ValidationFailure[]
}

/**
 * Valide un lot de fichiers. Renvoie séparément ceux qui passent et ceux
 * rejetés avec un motif clair (taille, format, vide).
 */
export function validateFiles(files: FileList | File[]): ValidationResult {
  const list = Array.from(files)
  const ok: File[] = []
  const failures: ValidationFailure[] = []

  for (const file of list) {
    const ext = (file.name.split('.').pop() ?? '').toLowerCase()
    if (!ext) {
      failures.push({ fileName: file.name, reason: 'Extension manquante' })
      continue
    }
    if (!ALL_EXTS.has(ext)) {
      failures.push({
        fileName: file.name,
        reason: `Format .${ext} non accepté. Formats acceptés : ${formatList()}`,
      })
      continue
    }
    if (file.size === 0) {
      failures.push({ fileName: file.name, reason: 'Fichier vide' })
      continue
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      failures.push({
        fileName: file.name,
        reason: `Fichier trop volumineux (${humanSize(file.size)}). Maximum : ${MAX_FILE_SIZE_LABEL}.`,
      })
      continue
    }
    ok.push(file)
  }

  return { ok, failures }
}

export function formatList(): string {
  return ACCEPTED_FORMATS.map((f) => f.label).join(' · ')
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
