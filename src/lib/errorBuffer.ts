/**
 * Buffer d'erreurs global (Phase 0 — socle Centre d'aide).
 * Conserve en memoire les N dernieres erreurs (console, rejets non geres, requetes 4xx/5xx)
 * pour les joindre a un ticket de support (« contexte auto-capte »).
 *
 * Securite : on n'enregistre JAMAIS d'en-tete, de token ou de corps de requete —
 * uniquement le type, un message tronque et le chemin (sans query string).
 */

export type CapturedErrorType = 'console' | 'unhandled' | 'network'

export interface CapturedError {
  ts: string
  type: CapturedErrorType
  message: string
  /** Contexte non sensible : chemin de la requete, sans query string. */
  detail?: string
}

const MAX_ENTRIES = 25
const buffer: CapturedError[] = []

type Subscriber = (entry: CapturedError) => void
const subscribers = new Set<Subscriber>()

/** S'abonner aux erreurs captées en temps réel (utilisé par l'enregistreur). Retourne un désabonnement. */
export function subscribeErrors(cb: Subscriber): () => void {
  subscribers.add(cb)
  return () => { subscribers.delete(cb) }
}

function push(entry: CapturedError): void {
  buffer.push(entry)
  if (buffer.length > MAX_ENTRIES) buffer.shift()
  subscribers.forEach((s) => { try { s(entry) } catch { /* un abonné ne doit pas casser la capture */ } })
}

/** Copie immuable des erreurs recentes (la plus ancienne en premier). */
export function getRecentErrors(): CapturedError[] {
  return [...buffer]
}

export function clearRecentErrors(): void {
  buffer.length = 0
}

/** Retire la query string : evite de capter un eventuel token passe en URL. */
function safePath(url: string): string {
  try {
    return new URL(url, window.location.origin).pathname
  } catch {
    return url.slice(0, 200)
  }
}

let installed = false

/** A appeler une seule fois au demarrage (idempotent, sans effet hors navigateur). */
export function installErrorBuffer(): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  window.addEventListener('error', (ev: ErrorEvent) => {
    push({ ts: new Date().toISOString(), type: 'console', message: String(ev.message).slice(0, 300) })
  })

  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    const reason = ev.reason
    const message = reason instanceof Error ? reason.message : String(reason)
    // Les abort de cleanup (useEffect / navigation) sont attendus : on les ignore.
    if (/aborted|AbortError/i.test(message)) return
    push({ ts: new Date().toISOString(), type: 'unhandled', message: message.slice(0, 300) })
  })

  // Wrap leger de fetch : observe les 4xx/5xx sans alterer le comportement ni logger de secret.
  const originalFetch = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init)
    try {
      if (response.status >= 400) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        push({
          ts: new Date().toISOString(),
          type: 'network',
          message: `HTTP ${response.status}`,
          detail: `${init?.method ?? 'GET'} ${safePath(url)}`,
        })
      }
    } catch {
      // Ne jamais casser un fetch a cause de l'observation.
    }
    return response
  }
}
