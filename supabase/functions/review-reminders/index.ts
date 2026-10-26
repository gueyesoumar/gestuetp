import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/resend.ts'
import { loadCabinetEmailBranding, buildEmailFrom, type CabinetEmailBranding } from '../_shared/email-branding.ts'
import { reviewReminderHtml, reviewSubject, reviewInAppLabel, type ReviewPalier } from '../_shared/email-templates/review-reminder.ts'
import { notify } from '../_shared/notify.ts'

/**
 * Edge review-reminders (n°18 Lot 2). Tirée par pg_cron (quotidien 07:00 UTC).
 * Parcourt les cycles de revue configurés, calcule le palier (J-30 / J-7 / échéance)
 * et prévient le superviseur assigné (in-app + email). Idempotent via email_log.
 * Auth : secret d'ordonnancement uniquement (x-cron-secret), pas d'utilisateur.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

const NATURES = ['group_ownership', 'regulatory_supervision']

function pickPalier(daysUntil: number): ReviewPalier | null {
  if (daysUntil <= 0) return 'due'
  if (daysUntil <= 7) return 'j7'
  if (daysUntil <= 30) return 'j30'
  return null
}

interface CycleRow { id: string; organization_id: string; framework_id: string; next_review_at: string | null; frequency_months: number | null }
interface Assignment { assignee_user_id: string; scope_type: string; scope_org_id: string | null; scope_sector: string | null; regulator_org_id: string }
interface UserRow { id: string; first_name: string | null; email: string; is_active: boolean; email_preferences: { reminders_enabled: boolean; unsubscribe_token: string } | null }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const cronSecret = req.headers.get('x-cron-secret')
    const expected = Deno.env.get('REVIEW_CRON_SECRET')
    if (!cronSecret || !expected || !timingSafeEqual(cronSecret, expected)) return json({ error: 'Non autorisé' }, 401)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'https://app.gestugroup.com'

    // 1. Cycles configurés (cadence + échéance posées).
    const { data: cyclesRaw, error: cErr } = await admin
      .from('assujetti_review_cycles')
      .select('id, organization_id, framework_id, next_review_at, frequency_months')
      .not('frequency_months', 'is', null)
      .not('next_review_at', 'is', null)
    if (cErr) { console.error('[review-reminders] cycles:', cErr.message); return json({ error: 'Lecture des cycles impossible' }, 500) }
    const cycles = (cyclesRaw ?? []) as CycleRow[]
    const todayMs = Date.parse(new Date().toISOString().slice(0, 10))
    const due = cycles
      .map((c) => ({ c, palier: pickPalier(Math.round((Date.parse(c.next_review_at!) - todayMs) / 86_400_000)), daysUntil: Math.round((Date.parse(c.next_review_at!) - todayMs) / 86_400_000) }))
      .filter((x): x is { c: CycleRow; palier: ReviewPalier; daysUntil: number } => x.palier !== null)
    if (due.length === 0) return json({ ok: true, sent: 0, skipped: 0 })

    // 2. Référentiels + organisations (nom, secteur) des cycles concernés.
    const orgIds = [...new Set(due.map((x) => x.c.organization_id))]
    const fwIds = [...new Set(due.map((x) => x.c.framework_id))]
    const orgMap = new Map<string, { name: string; sector: string | null }>()
    const { data: orgs } = await admin.from('organizations').select('id, name, sector').in('id', orgIds)
    for (const o of (orgs ?? []) as Array<{ id: string; name: string; sector: string | null }>) orgMap.set(o.id, { name: o.name, sector: o.sector })
    const fwMap = new Map<string, string>()
    const { data: fws } = await admin.from('frameworks').select('id, name').in('id', fwIds)
    for (const f of (fws ?? []) as Array<{ id: string; name: string }>) fwMap.set(f.id, f.name)

    // 3. Affectations de supervision + carte parent (graphe hiérarchie).
    const { data: asgRaw } = await admin.from('supervision_assignments').select('assignee_user_id, scope_type, scope_org_id, scope_sector, regulator_org_id')
    const assignments = (asgRaw ?? []) as Assignment[]
    const byOrg = new Map<string, Set<string>>()
    const bySector: Assignment[] = []
    for (const a of assignments) {
      if (a.scope_type === 'org' && a.scope_org_id) (byOrg.get(a.scope_org_id) ?? byOrg.set(a.scope_org_id, new Set()).get(a.scope_org_id)!).add(a.assignee_user_id)
      else if (a.scope_type === 'sector' && a.scope_sector) bySector.push(a)
    }
    const { data: edges } = await admin.from('organization_relationships').select('actor_org_id, target_org_id').eq('status', 'active').in('nature', NATURES)
    const parentOf = new Map<string, string>()
    for (const e of (edges ?? []) as Array<{ actor_org_id: string; target_org_id: string }>) parentOf.set(e.target_org_id, e.actor_org_id)
    const rootRegulator = (org: string): string => { let cur = org; const seen = new Set<string>(); while (parentOf.has(cur) && !seen.has(cur)) { seen.add(cur); cur = parentOf.get(cur)! } return cur }

    // Sous-arbres des régulateurs ayant des affectations par secteur (cache) + fallback perm.
    const subtreeCache = new Map<string, Set<string>>()
    const subtreeOf = async (reg: string): Promise<Set<string>> => {
      if (!subtreeCache.has(reg)) {
        const { data } = await admin.rpc('get_subsidiary_ids', { parent_id: reg })
        subtreeCache.set(reg, new Set(((data ?? []) as string[])))
      }
      return subtreeCache.get(reg)!
    }
    const fallbackCache = new Map<string, string[]>()
    const fallbackFor = async (reg: string): Promise<string[]> => {
      if (fallbackCache.has(reg)) return fallbackCache.get(reg)!
      const { data: roles } = await admin.from('platform_roles').select('id').eq('organization_id', reg).eq('permissions->>can_manage_supervision_assignments', 'true')
      const roleIds = ((roles ?? []) as Array<{ id: string }>).map((r) => r.id)
      let ids: string[] = []
      if (roleIds.length > 0) {
        const { data: upr } = await admin.from('user_platform_roles').select('user_id').in('platform_role_id', roleIds)
        ids = [...new Set(((upr ?? []) as Array<{ user_id: string }>).map((u) => u.user_id))]
      }
      fallbackCache.set(reg, ids)
      return ids
    }

    // 4. Destinataires par cycle.
    const recipientsByCycle = new Map<string, Set<string>>()
    for (const { c } of due) {
      const set = new Set<string>(byOrg.get(c.organization_id) ?? [])
      const sector = orgMap.get(c.organization_id)?.sector ?? null
      if (sector) for (const a of bySector) { if (a.scope_sector === sector && (await subtreeOf(a.regulator_org_id)).has(c.organization_id)) set.add(a.assignee_user_id) }
      if (set.size === 0) for (const uid of await fallbackFor(rootRegulator(c.organization_id))) set.add(uid)
      recipientsByCycle.set(c.id, set)
    }

    // 5. Chargement groupé des utilisateurs + préférences email.
    const allUserIds = [...new Set([...recipientsByCycle.values()].flatMap((s) => [...s]))]
    const userMap = new Map<string, UserRow>()
    if (allUserIds.length > 0) {
      const { data: users } = await admin.from('users').select('id, first_name, email, is_active, email_preferences:email_preferences(reminders_enabled, unsubscribe_token)').in('id', allUserIds)
      for (const u of (users ?? []) as unknown as UserRow[]) userMap.set(u.id, u)
    }
    const brandingCache = new Map<string, CabinetEmailBranding | null>()
    const getBranding = async (reg: string): Promise<CabinetEmailBranding | null> => {
      if (!brandingCache.has(reg)) brandingCache.set(reg, await loadCabinetEmailBranding(admin, reg))
      return brandingCache.get(reg) ?? null
    }

    let sent = 0, skipped = 0, failed = 0
    for (const { c, daysUntil, palier } of due) {
      const org = orgMap.get(c.organization_id)
      const reg = rootRegulator(c.organization_id)
      for (const uid of recipientsByCycle.get(c.id) ?? []) {
        const user = userMap.get(uid)
        if (!user || !user.is_active || !user.email) { skipped++; continue }
        const logType = `review_${palier}`
        const { data: existing } = await admin.from('email_log').select('id').eq('user_id', uid).eq('type', logType).eq('related_id', c.id).maybeSingle()
        if (existing) { skipped++; continue }

        const ctx = {
          recipientFirstName: user.first_name || 'bonjour',
          assujettiName: org?.name ?? 'Assujetti',
          frameworkName: fwMap.get(c.framework_id) ?? 'Référentiel',
          dueDate: c.next_review_at!, daysUntil,
          reviewUrl: `${appBaseUrl}/assujettis/${c.organization_id}`,
          unsubscribeUrl: `${appBaseUrl}/unsubscribe?token=${encodeURIComponent(user.email_preferences?.unsubscribe_token ?? '')}`,
        }
        // In-app (respecte notification_preferences).
        await notify(admin, {
          userId: uid, type: 'review_due', title: reviewInAppLabel(palier),
          body: `${ctx.assujettiName} · ${ctx.frameworkName}`,
          link: `/assujettis/${c.organization_id}`,
          metadata: { organization_id: c.organization_id, framework_id: c.framework_id, cycle_id: c.id, palier },
        })
        // Email (si relances activées).
        let resendId: string | null = null
        if (user.email_preferences?.reminders_enabled !== false) {
          const branding = await getBranding(reg)
          const r = await sendEmail({ to: user.email, subject: reviewSubject(palier, ctx), html: reviewReminderHtml(palier, ctx, branding), from: buildEmailFrom(branding) })
          if (r.error) { console.error('[review-reminders] resend:', r.error); failed++ }
          else resendId = r.id ?? null
        }
        await admin.from('email_log').insert({ user_id: uid, type: logType, related_id: c.id, resend_id: resendId })
        sent++
      }
    }
    console.log(`[review-reminders] sent=${sent} skipped=${skipped} failed=${failed}`)
    return json({ ok: true, sent, skipped, failed })
  } catch (err) {
    console.error('[review-reminders]', err instanceof Error ? err.message : String(err))
    return json({ error: 'Erreur interne' }, 500)
  }
})
