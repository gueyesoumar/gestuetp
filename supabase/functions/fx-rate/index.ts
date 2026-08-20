// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * fx-rate — taux de change EUR↔USD avec cache 24 h (RFC 0006, devise).
 * XOF↔EUR est une parité fixe (655,957, côté front) ; seul EUR↔USD flotte.
 * Source : ECB via frankfurter.dev (gratuit, sans clé). Repli : dernier cache /
 * seed. Écrit fx_rates via service_role ; lecture par tout authenticated.
 */

const CACHE_MS = 24 * 60 * 60 * 1000

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const db = admin as any

  const { data: row } = await db.from('fx_rates').select('per_eur, updated_at').eq('quote', 'USD').single()
  let perEur: number = row?.per_eur ?? 1.08
  let updatedAt: string | null = row?.updated_at ?? null

  const stale = !updatedAt || (Date.now() - new Date(updatedAt).getTime() > CACHE_MS)
  if (stale) {
    try {
      const r = await fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD')
      if (r.ok) {
        const j = await r.json() as { rates?: { USD?: number } }
        const usd = j?.rates?.USD
        if (typeof usd === 'number' && usd > 0) {
          perEur = usd
          updatedAt = new Date().toISOString()
          await db.from('fx_rates').upsert({ quote: 'USD', per_eur: usd, updated_at: updatedAt }, { onConflict: 'quote' })
        }
      }
    } catch (err) {
      console.error('[fx-rate] fetch:', err instanceof Error ? err.message : err) // repli : cache/seed
    }
  }

  return json({ eur_usd: perEur, updated_at: updatedAt })
})
