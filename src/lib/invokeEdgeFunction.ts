import { supabase } from './supabase'

/**
 * Wrapper sur supabase.functions.invoke qui extrait correctement les
 * messages d'erreur métier renvoyés dans le body de réponses 4xx/5xx.
 *
 * Sans ce wrapper, supabase-js v2 retourne un FunctionsHttpError avec
 * le message générique "Edge Function returned a non-2xx status code"
 * pour toute réponse non-2xx, masquant le `{ error: "..." }` du body.
 */

export interface EdgeResult<T = Record<string, unknown>> {
  ok: boolean
  error?: string
  data?: T
}

interface FunctionsErrorWithContext { message: string; context?: Response }

export async function invokeEdgeFunction<T = Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<EdgeResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, { body })
    if (error) {
      let msg = error.message
      const ctx = (error as FunctionsErrorWithContext).context
      if (ctx && typeof ctx.json === 'function') {
        try {
          const responseBody = await ctx.json() as { error?: string } | null
          if (responseBody?.error) msg = String(responseBody.error)
        } catch {
          // body non-JSON ou déjà consommé — on garde le message générique
        }
      }
      return { ok: false, error: msg }
    }
    const res = data as ({ error?: string } & T) | null
    if (res?.error) return { ok: false, error: String(res.error) }
    return { ok: true, data: (res ?? undefined) as T | undefined }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur inconnue' }
  }
}
