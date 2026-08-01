import { corsHeaders } from '../_shared/cors.ts'

// Collecteur de violations CSP (phase d'observation avant de passer le
// Content-Security-Policy de Report-Only à bloquant).
//
// Endpoint PUBLIC et non authentifié : le navigateur poste les rapports sans
// jeton. À déployer avec --no-verify-jwt. Ne fait QUE journaliser (aucune
// écriture sensible, aucune action). Répond toujours 204, ne renvoie jamais
// de détail au client.
//
// Deux formats gérés :
//   - report-uri  : Content-Type application/csp-report  -> { "csp-report": {...} }
//   - report-to   : Content-Type application/reports+json -> [ { type, body }, ... ]

interface CspFields {
  directive?: string
  blocked?: string
  documentUri?: string
  sourceFile?: string
  line?: number | string
}

function pick(r: Record<string, unknown>): CspFields {
  // Clés report-uri (kebab-case) OU report-to (camelCase).
  const g = (a: string, b: string): unknown => r[a] ?? r[b]
  return {
    directive: (g('violated-directive', 'effectiveDirective') ?? g('effective-directive', 'violatedDirective')) as string | undefined,
    blocked: (g('blocked-uri', 'blockedURL')) as string | undefined,
    documentUri: (g('document-uri', 'documentURL')) as string | undefined,
    sourceFile: (g('source-file', 'sourceFile')) as string | undefined,
    line: (g('line-number', 'lineNumber')) as number | string | undefined,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: corsHeaders })

  try {
    const raw = await req.json().catch(() => null)
    const reports: Record<string, unknown>[] = []
    if (raw && typeof raw === 'object') {
      if (Array.isArray(raw)) {
        // report-to : liste d'objets { type, body }
        for (const item of raw) {
          const body = (item as { body?: unknown }).body
          if (body && typeof body === 'object') reports.push(body as Record<string, unknown>)
        }
      } else if ('csp-report' in raw) {
        // report-uri : { "csp-report": {...} }
        reports.push((raw as { 'csp-report': Record<string, unknown> })['csp-report'])
      } else {
        reports.push(raw as Record<string, unknown>)
      }
    }

    for (const r of reports) {
      const f = pick(r)
      // Une ligne structurée et greppable par violation (agrégation via les logs).
      console.warn('[csp-report]', JSON.stringify({
        directive: f.directive ?? null,
        blocked: f.blocked ?? null,
        document: f.documentUri ?? null,
        source: f.sourceFile ?? null,
        line: f.line ?? null,
      }))
    }
  } catch (e) {
    console.error('[csp-report] parse:', e instanceof Error ? e.message : String(e))
  }

  // Toujours 204 : le navigateur n'attend aucun corps.
  return new Response(null, { status: 204, headers: corsHeaders })
})
