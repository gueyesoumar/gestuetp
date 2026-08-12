import { useState, useCallback } from 'react'
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction'
import type { EntityType } from '../../lib/constants'

/** Profil réglementaire d'un assujetti (Gëstu Regul / M1). */
export interface RegulatoryProfile {
  criticality: 'eleve' | 'standard'
  obligation_regime: string | null
  tier: string | null
  status: 'active' | 'exited'
  entry_date: string | null
  exit_date: string | null
}

/** Entité telle que renvoyée par l'Edge Function manage-entity (action list). */
export interface EntityRow {
  id: string
  name: string
  entity_type: EntityType | null
  parent_org_id: string | null
  sector: string | null
  city: string | null
  country: string | null
  is_active: boolean
  regulatory_profile: RegulatoryProfile | null
}

export interface EntityInput {
  name: string
  entity_type: EntityType
  parent_org_id?: string
  sector?: string | null
  city?: string | null
  country?: string | null
  // Profil réglementaire (Regul) — envoyé uniquement en mode produit 'regul'.
  criticality?: 'eleve' | 'standard'
  obligation_regime?: string | null
  tier?: string | null
  reg_status?: 'active' | 'exited'
  entry_date?: string | null
  exit_date?: string | null
}

interface MutationResult {
  ok: boolean
  error?: string
}

/** Résultat de création : ajoute l'id de l'entité créée (pour auto-sélection). */
interface CreateResult extends MutationResult {
  id?: string
}

/**
 * Mutations sur les entités internes d'un groupe, via l'Edge Function
 * manage-entity (service_role côté backend — aucune écriture directe sur
 * organizations côté client). Les erreurs métier sont remontées telles quelles
 * pour affichage; les détails techniques restent loggés côté fonction.
 */
export function useManageEntity() {
  const [busy, setBusy] = useState(false)

  const run = useCallback(async (body: Record<string, unknown>): Promise<MutationResult> => {
    setBusy(true)
    const res = await invokeEdgeFunction('manage-entity', body)
    setBusy(false)
    return { ok: res.ok, error: res.error }
  }, [])

  const listInactive = useCallback(async (): Promise<EntityRow[]> => {
    const res = await invokeEdgeFunction<{ entities: EntityRow[] }>('manage-entity', { action: 'list' })
    if (!res.ok || !res.data) return []
    return res.data.entities.filter((e) => !e.is_active)
  }, [])

  const createEntity = useCallback(async (input: EntityInput): Promise<CreateResult> => {
    setBusy(true)
    const res = await invokeEdgeFunction<{ entity: { id: string } }>('manage-entity', { action: 'create', ...input })
    setBusy(false)
    return { ok: res.ok, error: res.error, id: res.data?.entity?.id }
  }, [])
  const updateEntity = useCallback((entityId: string, patch: Partial<EntityInput>) => run({ action: 'update', entity_id: entityId, ...patch }), [run])
  const deactivateEntity = useCallback((entityId: string) => run({ action: 'deactivate', entity_id: entityId }), [run])
  const reactivateEntity = useCallback((entityId: string) => run({ action: 'reactivate', entity_id: entityId }), [run])

  return { busy, createEntity, updateEntity, deactivateEntity, reactivateEntity, listInactive }
}
