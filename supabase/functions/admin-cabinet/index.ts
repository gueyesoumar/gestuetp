import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : admin-cabinet
 *
 * Actions super-admin sur une organisation (cabinet, client ou autre):
 *  - suspend     : passe is_active = false. Les RLS continuent de filtrer normalement,
 *                  donc les membres perdent l'accès aux missions/données.
 *  - reactivate  : passe is_active = true.
 *  - export      : génère un CSV en mémoire des données clés (membres + missions).
 *
 * Toutes les actions sont gardées par requirePlatformOwner et tracées dans admin_audit_log.
 */

interface BaseBody { action: 'suspend' | 'reactivate' | 'export'; cabinet_id: string; reason: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { owner, admin } = guard

  try {
    const body = await req.json() as BaseBody
    if (!body.cabinet_id || !body.action || !body.reason?.trim()) {
      return jsonResponse({ error: 'cabinet_id, action et reason requis' }, 400)
    }

    const { data: cabinet, error: loadError } = await admin
      .from('organizations')
      .select('id, name, slug, is_active')
      .eq('id', body.cabinet_id)
      .single()

    if (loadError || !cabinet) {
      return jsonResponse({ error: 'Cabinet introuvable' }, 404)
    }
    const cab = cabinet as { id: string; name: string; slug: string; is_active: boolean }

    if (body.action === 'suspend') {
      if (!cab.is_active) {
        return jsonResponse({ error: 'Cabinet déjà suspendu' }, 409)
      }
      // deno-lint-ignore no-explicit-any
      const { error } = await (admin.from('organizations') as any)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', cab.id)
      if (error) {
        console.error('[admin-cabinet] suspend error:', error.message)
        return jsonResponse({ error: 'Suspension impossible' }, 500)
      }
      await logAdminAction(admin, owner.id, 'suspend_cabinet', 'organization', cab.id, body.reason, { name: cab.name, slug: cab.slug })
      return jsonResponse({ success: true })
    }

    if (body.action === 'reactivate') {
      if (cab.is_active) {
        return jsonResponse({ error: 'Cabinet déjà actif' }, 409)
      }
      // deno-lint-ignore no-explicit-any
      const { error } = await (admin.from('organizations') as any)
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', cab.id)
      if (error) {
        console.error('[admin-cabinet] reactivate error:', error.message)
        return jsonResponse({ error: 'Réactivation impossible' }, 500)
      }
      await logAdminAction(admin, owner.id, 'reactivate_cabinet', 'organization', cab.id, body.reason, { name: cab.name })
      return jsonResponse({ success: true })
    }

    if (body.action === 'export') {
      const csv = await buildCabinetCsv(admin, cab.id, cab.name)
      await logAdminAction(admin, owner.id, 'export_cabinet_data', 'organization', cab.id, body.reason, {
        name: cab.name,
        bytes: csv.length,
      })
      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="cabinet-${cab.slug}-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    return jsonResponse({ error: `Action inconnue: ${body.action}` }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-cabinet] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

async function buildCabinetCsv(
  // deno-lint-ignore no-explicit-any
  admin: any,
  cabinetId: string,
  cabinetName: string,
): Promise<string> {
  const escape = (v: string | null | undefined) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const lines: string[] = []
  lines.push(`"Export cabinet · ${cabinetName.replace(/"/g, '""')}"`)
  lines.push(`"Généré le ${new Date().toISOString()}"`)
  lines.push('')

  // Membres
  lines.push('"=== MEMBRES ==="')
  lines.push(['email', 'first_name', 'last_name', 'job_title', 'is_active', 'last_sign_in_at', 'created_at'].join(','))
  const { data: members } = await admin
    .from('users')
    .select('email, first_name, last_name, job_title, is_active, last_sign_in_at, created_at')
    .eq('organization_id', cabinetId)
  for (const m of (members ?? []) as Array<Record<string, unknown>>) {
    lines.push([
      escape(m.email as string),
      escape(m.first_name as string),
      escape(m.last_name as string),
      escape(m.job_title as string | null),
      escape(String(m.is_active)),
      escape(m.last_sign_in_at as string | null),
      escape(m.created_at as string),
    ].join(','))
  }
  lines.push('')

  // Missions
  lines.push('"=== MISSIONS ==="')
  lines.push(['name', 'status', 'phase', 'start_date', 'end_date', 'created_at'].join(','))
  const { data: missions } = await admin
    .from('missions')
    .select('name, status, phase, start_date, end_date, created_at')
    .eq('cabinet_id', cabinetId)
  for (const m of (missions ?? []) as Array<Record<string, unknown>>) {
    lines.push([
      escape(m.name as string),
      escape(m.status as string),
      escape(m.phase as string | null),
      escape(m.start_date as string | null),
      escape(m.end_date as string | null),
      escape(m.created_at as string),
    ].join(','))
  }

  return lines.join('\n')
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
