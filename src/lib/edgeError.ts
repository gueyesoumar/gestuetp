/**
 * Extraction d'un message d'erreur EXPLICITE et sûr depuis un appel
 * `supabase.functions.invoke`.
 *
 * Règle plateforme : afficher le message contrôlé renvoyé par l'edge function
 * (toujours en français, jamais une stack trace — la protection anti-fuite est
 * côté serveur, cf CLAUDE.md #3) plutôt qu'une chaîne générique.
 *
 * supabase-js range le corps d'un 4xx/5xx dans `error.context` (une Response),
 * pas dans `data.error` — d'où la lecture asynchrone du corps ici.
 */

interface InvokeErrorLike {
  message?: string
  context?: { json?: () => Promise<unknown> }
}

export async function readInvokeError(
  error: unknown,
  data: unknown,
  fallback: string,
): Promise<string> {
  // 1. La fonction a répondu 200 avec { error: "..." }
  if (data && typeof data === 'object' && 'error' in data) {
    const msg = (data as { error?: unknown }).error
    if (msg) return String(msg)
  }
  // 2. Réponse non-2xx : le corps est dans error.context
  const err = error as InvokeErrorLike | null
  if (err?.context?.json) {
    try {
      const body = await err.context.json()
      if (body && typeof body === 'object' && 'error' in body) {
        const msg = (body as { error?: unknown }).error
        if (msg) return String(msg)
      }
    } catch {
      // corps non-JSON : on retombe sur le message de transport
    }
  }
  // 3. Message de transport, sinon fallback
  return err?.message || fallback
}
