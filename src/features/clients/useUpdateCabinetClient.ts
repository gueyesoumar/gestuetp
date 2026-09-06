import { useState, useCallback } from 'react'
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction'
import type { CabinetClientUpdate } from '../../types/database.types'

interface UseUpdateCabinetClientResult {
  updateClient: (id: string, data: CabinetClientUpdate) => Promise<boolean>
  updating: boolean
  error: string | null
}

/**
 * P1b (RFC 0007) — la mise à jour d'un client passe par l'Edge Function
 * `update-client` (service_role) : elle écrit la fiche `cabinet_clients` (miroir)
 * ET le profil d'engagement (`engagement_profiles`, source de vérité du contexte).
 * Remplace le PATCH REST direct.
 */
export function useUpdateCabinetClient(onSuccess?: () => void): UseUpdateCabinetClientResult {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateClient = useCallback(async (id: string, data: CabinetClientUpdate): Promise<boolean> => {
    setUpdating(true)
    setError(null)

    const res = await invokeEdgeFunction('update-client', { id, ...(data as Record<string, unknown>) })

    if (!res.ok) {
      console.error('useUpdateCabinetClient:', res.error)
      setError(res.error ?? 'Impossible de mettre à jour le client.')
      setUpdating(false)
      return false
    }

    setUpdating(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  return { updateClient, updating, error }
}
