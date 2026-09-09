/**
 * Client minimal de l'API OVH pour gérer les enregistrements DNS de la zone
 * gestugroup.com (création CNAME + TXT à l'ajout d'un sous-domaine cabinet).
 *
 * Secrets requis (edge, jamais côté client) :
 *   OVH_APP_KEY / OVH_APP_SECRET / OVH_CONSUMER_KEY : credentials scopés à
 *     /domain/zone/gestugroup.com/* (GET/POST/DELETE)
 *   OVH_ZONE     : zone gérée (défaut gestugroup.com)
 *   OVH_ENDPOINT : ovh-eu (défaut) | ovh-ca | ovh-us
 *
 * SÉCURITÉ — garde-fous critiques (écriture DNS en prod) :
 *   - Seuls les fieldType CNAME et TXT sont autorisés.
 *   - subDomain vide (= apex) est INTERDIT → protège apex, MX, NS, DKIM…
 *   - La suppression passe TOUJOURS par une liste filtrée (fieldType+subDomain
 *     exacts) puis delete par id : jamais de suppression en masse.
 */

interface OvhConfig {
  appKey: string
  appSecret: string
  consumerKey: string
  zone: string
  base: string
}

export interface OvhRecordInput {
  fieldType: 'CNAME' | 'TXT'
  subDomain: string
  target: string
  ttl?: number
}

const SAFE_TYPES = new Set(['CNAME', 'TXT'])

function endpointBase(endpoint: string): string {
  switch (endpoint) {
    case 'ovh-ca': return 'https://ca.api.ovh.com/1.0'
    case 'ovh-us': return 'https://api.us.ovhcloud.com/1.0'
    case 'ovh-eu':
    default: return 'https://eu.api.ovh.com/1.0'
  }
}

export function getOvhConfig(): OvhConfig {
  const appKey = Deno.env.get('OVH_APP_KEY')
  const appSecret = Deno.env.get('OVH_APP_SECRET')
  const consumerKey = Deno.env.get('OVH_CONSUMER_KEY')
  const zone = Deno.env.get('OVH_ZONE') ?? 'gestugroup.com'
  const endpoint = Deno.env.get('OVH_ENDPOINT') ?? 'ovh-eu'
  if (!appKey || !appSecret || !consumerKey) {
    throw new Error('Configuration OVH absente (OVH_APP_KEY/SECRET/CONSUMER_KEY)')
  }
  return { appKey, appSecret, consumerKey, zone, base: endpointBase(endpoint) }
}

function assertSafe(fieldType: string, subDomain: string): void {
  if (!SAFE_TYPES.has(fieldType)) throw new Error(`OVH: fieldType interdit (${fieldType})`)
  if (!subDomain || subDomain.trim() === '') throw new Error('OVH: subDomain vide interdit (protection apex)')
}

async function sha1Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Horodatage serveur OVH (endpoint public, non signé) pour éviter tout décalage
// d'horloge ; repli sur l'horloge locale en cas d'échec.
async function ovhTime(cfg: OvhConfig): Promise<number> {
  try {
    const res = await fetch(`${cfg.base}/auth/time`)
    if (res.ok) {
      const n = parseInt(await res.text(), 10)
      if (Number.isFinite(n)) return n
    }
  } catch { /* repli ci-dessous */ }
  return Math.floor(Date.now() / 1000)
}

async function ovhRequest<T>(cfg: OvhConfig, method: string, path: string, body?: unknown): Promise<T> {
  const url = `${cfg.base}${path}`
  const bodyStr = body === undefined ? '' : JSON.stringify(body)
  const timestamp = await ovhTime(cfg)
  const signature = '$1$' + await sha1Hex(
    `${cfg.appSecret}+${cfg.consumerKey}+${method}+${url}+${bodyStr}+${timestamp}`,
  )
  const res = await fetch(url, {
    method,
    headers: {
      'X-Ovh-Application': cfg.appKey,
      'X-Ovh-Consumer': cfg.consumerKey,
      'X-Ovh-Timestamp': String(timestamp),
      'X-Ovh-Signature': signature,
      'Content-Type': 'application/json',
    },
    body: bodyStr === '' ? undefined : bodyStr,
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const j = await res.json() as { message?: string }
      if (j.message) msg = j.message
    } catch { /* corps non-JSON */ }
    throw new Error(`OVH ${method} ${path}: ${msg}`)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

// Crée un enregistrement DNS et retourne son id.
export async function ovhCreateRecord(cfg: OvhConfig, rec: OvhRecordInput): Promise<number> {
  assertSafe(rec.fieldType, rec.subDomain)
  const created = await ovhRequest<{ id: number }>(cfg, 'POST', `/domain/zone/${cfg.zone}/record`, {
    fieldType: rec.fieldType,
    subDomain: rec.subDomain,
    target: rec.target,
    ttl: rec.ttl ?? 60,
  })
  return created.id
}

// Liste les ids des enregistrements correspondant EXACTEMENT à (fieldType, subDomain).
export async function ovhListRecordIds(cfg: OvhConfig, fieldType: 'CNAME' | 'TXT', subDomain: string): Promise<number[]> {
  assertSafe(fieldType, subDomain)
  const q = `?fieldType=${encodeURIComponent(fieldType)}&subDomain=${encodeURIComponent(subDomain)}`
  return await ovhRequest<number[]>(cfg, 'GET', `/domain/zone/${cfg.zone}/record${q}`)
}

// Supprime un enregistrement par id (obtenu via ovhListRecordIds — jamais en masse).
export async function ovhDeleteRecord(cfg: OvhConfig, id: number): Promise<void> {
  await ovhRequest(cfg, 'DELETE', `/domain/zone/${cfg.zone}/record/${id}`)
}

// Applique les changements en zone (obligatoire après create/delete).
export async function ovhRefreshZone(cfg: OvhConfig): Promise<void> {
  await ovhRequest(cfg, 'POST', `/domain/zone/${cfg.zone}/refresh`)
}
