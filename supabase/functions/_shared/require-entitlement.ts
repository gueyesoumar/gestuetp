import { corsHeaders } from './cors.ts'

/**
 * Enforcement d'entitlement côté serveur (RFC 0008 P3).
 *
 * Renvoie `null` si l'accès est autorisé (clé `soft`, ou clé `hard` avec droit
 * actif), sinon une `Response` 403 générique à retourner directement depuis l'edge.
 * La décision vient de `entitlement_allows()` (politique globale + org_entitlements).
 *
 * Fail-open sur erreur RPC : l'entitlement est un droit d'USAGE, pas une frontière
 * de sécurité (la RLS reste la barrière de confidentialité). On préfère ne pas
 * casser un utilisateur légitime sur un incident RPC transitoire — l'échec est loggé.
 */
interface RpcClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>
}

export async function requireEntitlement(
  admin: RpcClient,
  organizationId: string,
  key: string,
): Promise<Response | null> {
  const { data, error } = await admin.rpc('entitlement_allows', { p_org: organizationId, p_key: key })
  if (error) {
    console.error('[requireEntitlement]', key, error.message)
    return null // fail-open (non-sécurité)
  }
  if (data === true) return null
  return new Response(
    JSON.stringify({ error: "Cette fonctionnalité n'est pas incluse dans votre offre." }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}
