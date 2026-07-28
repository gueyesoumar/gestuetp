import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticateCaller } from '../_shared/auth.ts'
import { sendEmail } from '../_shared/resend.ts'

// Ancrage externe du journal probant (Gëstu Regul, reco audit #3).
//  - seal        : fige la tête de chaîne, enregistre un sceau, l'émet vers un
//                  témoin externe (email). Détecte toute réécriture ultérieure.
//  - verify-seal : re-confronte un sceau externe (seq + head_hash) à la base.
// Auth : soit un secret d'ordonnancement (x-cron-secret), soit un staff régulateur.

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (b: unknown, s: number): Response =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Auth : secret de cron OU staff régulateur (jamais client).
    const cronSecret = req.headers.get('x-cron-secret')
    const expected = Deno.env.get('PROBATIVE_CRON_SECRET')
    let actorId: string | null = null
    if (cronSecret && expected && timingSafeEqual(cronSecret, expected)) {
      // appel ordonnancé
    } else {
      const auth = await authenticateCaller(admin, req)
      if (!auth.ok) return json({ error: auth.message }, auth.status)
      if (auth.profile.role === 'client') return json({ error: 'Accès refusé' }, 403)
      actorId = auth.profile.id
    }

    const body = (await req.json().catch(() => ({}))) as { action?: string; seq?: number; head_hash?: string }
    const action = body.action ?? 'seal'

    // Intégrité globale de la chaîne (SECURITY DEFINER, renvoie ok/checked/broken_seq).
    const { data: vres } = await admin.rpc('verify_probative_chain')
    const v = (Array.isArray(vres) ? vres[0] : vres) as { ok: boolean; checked: number; broken_seq: number | null } | null
    const chainOk = v?.ok ?? false
    const brokenSeq = v?.broken_seq ?? null

    if (action === 'verify-seal') {
      if (typeof body.seq !== 'number' || !body.head_hash) return json({ error: 'seq et head_hash requis' }, 400)
      const { data: row } = await admin.from('probative_log').select('seq, hash').eq('seq', body.seq).maybeSingle()
      const matches = !!row && (row as { hash: string }).hash === body.head_hash
      return json({ matches, chain_ok: chainOk, broken_seq: brokenSeq }, 200)
    }

    if (action === 'seal') {
      const { data: headRows } = await admin.from('probative_log').select('seq, hash').order('seq', { ascending: false }).limit(1)
      const head = (headRows && headRows[0]) as { seq: number; hash: string } | undefined
      const { count } = await admin.from('probative_log').select('id', { count: 'exact', head: true })

      const seal = {
        seq_head: head?.seq ?? 0,
        entry_count: count ?? 0,
        head_hash: head?.hash ?? '',
        chain_ok: chainOk,
        broken_seq: brokenSeq,
        emitted_to: Deno.env.get('PROBATIVE_SEAL_RECIPIENT') ?? null,
      }
      const { data: inserted, error } = await admin.from('probative_seals').insert(seal).select('*').single()
      if (error) { console.error('[probative-seal] insert:', error.message); return json({ error: 'Échec de scellement' }, 500) }

      // Émission vers le témoin externe (hors DB) : e-mail horodaté et archivable.
      const recipient = Deno.env.get('PROBATIVE_SEAL_RECIPIENT')
      if (recipient) {
        const from = Deno.env.get('PROBATIVE_SEAL_FROM') ?? 'Gëstu Regul <no-reply@gestugroup.com>'
        const html = `<h2>Sceau du journal probant — Gëstu Regul</h2>
          <p>Ancrage externe périodique. Conservez cet e-mail : il atteste l'état de la chaîne à cette date.</p>
          <ul>
            <li><b>Scellé le</b> : ${inserted.sealed_at}</li>
            <li><b>Seq de tête</b> : ${seal.seq_head}</li>
            <li><b>Nombre d'entrées</b> : ${seal.entry_count}</li>
            <li><b>Hash de tête</b> : <code>${seal.head_hash || '(chaîne vide)'}</code></li>
            <li><b>Chaîne vérifiée</b> : ${seal.chain_ok ? 'OK' : `ROMPUE (seq ${seal.broken_seq})`}</li>
            <li><b>Réf. sceau</b> : ${inserted.id}</li>
          </ul>
          <p>Pour contrôler ultérieurement : action <code>verify-seal</code> avec ce seq et ce hash de tête.</p>`
        const r = await sendEmail({ to: recipient, subject: `Sceau journal probant — seq ${seal.seq_head} — ${inserted.sealed_at}`, html, from })
        if (r.error) console.error('[probative-seal] email:', r.error)
      } else {
        console.warn('[probative-seal] PROBATIVE_SEAL_RECIPIENT non défini : sceau enregistré sans émission externe')
      }

      if (!chainOk) console.error(`[probative-seal] ALERTE : chaîne rompue au seq ${brokenSeq}`)
      return json({ seal: inserted, actor: actorId }, 201)
    }

    return json({ error: 'Action inconnue' }, 400)
  } catch (e) {
    console.error('[probative-seal] unexpected:', e instanceof Error ? e.message : String(e))
    return json({ error: 'Erreur interne' }, 500)
  }
})
