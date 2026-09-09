/**
 * Client minimal de l'API Vercel pour rattacher/détacher un domaine custom au
 * projet (émission SSL automatique côté Vercel une fois le DNS résolu).
 *
 * Secrets requis (edge, jamais côté client) :
 *   VERCEL_TOKEN      : token API scopé à l'équipe/projet
 *   VERCEL_PROJECT_ID : id du projet gestuetp
 *   VERCEL_TEAM_ID    : id de l'équipe sencomply
 *
 * Idempotent : un domaine déjà présent (409) ou absent à la suppression (404)
 * est traité comme un succès.
 */

const API = 'https://api.vercel.com'

interface VercelConfig {
  token: string
  projectId: string
  teamId: string
}

// Lit la config Vercel depuis l'environnement ; lève une erreur explicite si un
// secret manque (le provisionnement est alors reporté, pas silencieux).
export function getVercelConfig(): VercelConfig {
  const token = Deno.env.get('VERCEL_TOKEN')
  const projectId = Deno.env.get('VERCEL_PROJECT_ID')
  const teamId = Deno.env.get('VERCEL_TEAM_ID')
  if (!token || !projectId || !teamId) {
    throw new Error('Configuration Vercel absente (VERCEL_TOKEN/PROJECT_ID/TEAM_ID)')
  }
  return { token, projectId, teamId }
}

function authHeaders(cfg: VercelConfig): HeadersInit {
  return { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' }
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json() as { error?: { message?: string; code?: string } }
    return body.error?.message ?? body.error?.code ?? `HTTP ${res.status}`
  } catch {
    return `HTTP ${res.status}`
  }
}

// Rattache le hostname au projet Vercel. Retourne true si (déjà) enregistré.
export async function vercelAddDomain(cfg: VercelConfig, hostname: string): Promise<true> {
  const res = await fetch(`${API}/v10/projects/${cfg.projectId}/domains?teamId=${cfg.teamId}`, {
    method: 'POST',
    headers: authHeaders(cfg),
    body: JSON.stringify({ name: hostname }),
  })
  if (res.ok || res.status === 409) return true // 409 = déjà rattaché → idempotent
  throw new Error(`Vercel add-domain: ${await errorMessage(res)}`)
}

// Détache le hostname du projet Vercel. 404 (absent) = idempotent.
export async function vercelRemoveDomain(cfg: VercelConfig, hostname: string): Promise<true> {
  const res = await fetch(`${API}/v9/projects/${cfg.projectId}/domains/${encodeURIComponent(hostname)}?teamId=${cfg.teamId}`, {
    method: 'DELETE',
    headers: authHeaders(cfg),
  })
  if (res.ok || res.status === 404) return true
  throw new Error(`Vercel remove-domain: ${await errorMessage(res)}`)
}
