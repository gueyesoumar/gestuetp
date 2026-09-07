import { supabase } from '../../lib/supabase'
import type { CabinetClient } from '../../types/database.types'

/**
 * Identité durable d'un client, SOURCE DE VÉRITÉ = le nœud `organizations` (RFC 0007
 * P1c.2). On la fusionne dans la forme `CabinetClient` au niveau de l'accès aux
 * données (comme le contexte P1c.1), en remappant les colonnes du nœud vers les noms
 * historiques `client_*`, de sorte que l'UI en aval reste inchangée. Le branding
 * (`brand_*`) et `client_email_domain` restent sur la fiche squelette (hors P1c.2).
 */
export type ClientNodeIdentity = Partial<Pick<CabinetClient,
  | 'client_name' | 'client_registration_number' | 'client_sector' | 'client_address'
  | 'client_city' | 'client_country' | 'client_website' | 'client_phone' | 'logo_url'>>

interface OrgIdentityRow {
  id: string
  name: string | null
  registration_number: string | null
  sector: string | null
  address: string | null
  city: string | null
  country: string | null
  website: string | null
  phone: string | null
  logo_url: string | null
}

function mapOrg(o: OrgIdentityRow): ClientNodeIdentity {
  return {
    client_name: o.name ?? '',
    client_registration_number: o.registration_number,
    client_sector: o.sector,
    client_address: o.address,
    client_city: o.city,
    client_country: o.country,
    client_website: o.website,
    client_phone: o.phone,
    logo_url: o.logo_url,
  }
}

const ORG_COLS = 'id, name, registration_number, sector, address, city, country, website, phone, logo_url'

export async function fetchClientIdentityMap(
  clientOrgIds: (string | null | undefined)[],
  signal?: AbortSignal,
): Promise<Map<string, ClientNodeIdentity>> {
  const map = new Map<string, ClientNodeIdentity>()
  const ids = [...new Set(clientOrgIds.filter((v): v is string => !!v))]
  if (ids.length === 0) return map
  const q = supabase.from('organizations').select(ORG_COLS).in('id', ids)
  const { data, error } = await (signal ? q.abortSignal(signal) : q)
  if (error || !data) return map
  for (const o of data as OrgIdentityRow[]) map.set(o.id, mapOrg(o))
  return map
}

export async function fetchClientIdentity(
  clientOrgId: string | null | undefined,
  signal?: AbortSignal,
): Promise<ClientNodeIdentity | null> {
  if (!clientOrgId) return null
  const map = await fetchClientIdentityMap([clientOrgId], signal)
  return map.get(clientOrgId) ?? null
}
