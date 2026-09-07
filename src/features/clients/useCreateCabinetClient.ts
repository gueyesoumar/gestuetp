import { useState, useCallback } from 'react'
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction'
import { useAuth } from '../../hooks/useAuth'
import type { CabinetClientInsert } from '../../types/database.types'

interface UseCreateCabinetClientResult {
  createClient: (data: Omit<CabinetClientInsert, 'cabinet_id'>) => Promise<string | null>
  creating: boolean
  error: string | null
}

/**
 * P1a (RFC 0007) — la création d'un client passe par l'Edge Function `create-client`
 * (service_role) : elle crée/réconcilie l'organisation-nœud, insère la fiche
 * `cabinet_clients` (client_org_id renseigné dès maintenant) et pose l'arête
 * `audit_engagement`. Fin de la matérialisation paresseuse : l'organisation existe
 * dès la création du client, plus au 1ᵉʳ lancement de mission.
 */
export function useCreateCabinetClient(onSuccess?: () => void): UseCreateCabinetClientResult {
  const { profile } = useAuth()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createClient = useCallback(async (data: Omit<CabinetClientInsert, 'cabinet_id'>): Promise<string | null> => {
    if (!profile?.organization_id) return null
    setCreating(true)
    setError(null)

    const res = await invokeEdgeFunction<{ cabinet_client_id: string }>('create-client', data as unknown as Record<string, unknown>)

    if (!res.ok || !res.data?.cabinet_client_id) {
      console.error('useCreateCabinetClient:', res.error)
      setError(res.error ?? 'Erreur lors de la création du client.')
      setCreating(false)
      return null
    }

    setCreating(false)
    onSuccess?.()
    return res.data.cabinet_client_id
  }, [profile?.organization_id, onSuccess])

  return { createClient, creating, error }
}
