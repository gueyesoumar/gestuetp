import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction'

export interface TrackedAction {
  id: string
  code: string
  /** Null pour une action manuelle (pas de mission rattachée). */
  mission_id: string | null
  mission_name: string | null
  entity_id: string
  entity_name: string
  control_code: string | null
  control_name: string | null
  finding_classification: string
  /** Le CONSTAT (observation). Pour une action manuelle, contient directement l'action saisie. */
  description: string
  /** La RECOMMANDATION = l'action a mener (source de verite, null pour une action manuelle). */
  recommendation: string | null
  risk: string | null
  deadline: string | null
  client_target_date: string | null
  status: string
  verification_status: string
  /** Au moins une mesure a été émise à partir de cette action. */
  escalated: boolean
  created_at: string
  /** Origine de l'action : issue d'une mission ou saisie manuellement par le régulateur. */
  source: 'mission' | 'manual'
}

/** Suivi des actions correctives agregees au niveau regulateur (CAR cross-missions).
 *  Lecture via la fonction SECURITY DEFINER get_regulator_action_tracking (scope
 *  sous-arbre, fail-closed pour les clients). p_entity_id null = tout le perimetre. */
export function useActionTracking(entityId: string | null): {
  actions: TrackedAction[]
  loading: boolean
  refetch: () => void
} {
  const [actions, setActions] = useState<TrackedAction[]>([])
  const [loading, setLoading] = useState(true)
  const [key, setKey] = useState(0)
  const refetch = useCallback(() => setKey((k) => k + 1), [])

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    supabase
      .rpc('get_regulator_action_tracking', { p_entity_id: entityId })
      .abortSignal(ac.signal)
      .then(({ data, error }) => {
        if (ac.signal.aborted) return
        if (error) {
          console.error('[useActionTracking]', error.message)
          setActions([])
        } else {
          setActions((data ?? []).map((row) => ({
            ...row,
            source: row.source === 'manual' ? 'manual' : 'mission',
          })))
        }
        setLoading(false)
      })
    return () => ac.abort()
  }, [entityId, key])

  return { actions, loading, refetch }
}

/** Une action est en retard si sa date cible (client sinon echeance auditeur) est
 *  passee et qu'elle n'est ni verifiee ni cloturee. */
export function isActionOverdue(a: TrackedAction): boolean {
  if (a.status === 'verified' || a.status === 'closed') return false
  const target = a.client_target_date ?? a.deadline
  if (!target) return false
  return new Date(target) < new Date()
}

/** Texte de l'action a mener. Mission : la recommandation du constat (repli sur le
 *  constat si vide). Manuel : la description saisie EST l'action. */
export function actionLabel(a: TrackedAction): string {
  const reco = a.recommendation?.trim()
  return reco && reco.length > 0 ? reco : a.description
}

export interface ManualActionInput {
  entity_id: string
  finding_classification: string
  description: string
  deadline: string | null
}

/** Ecriture des actions manuelles via l'Edge manage-manual-action (service_role,
 *  scope sous-arbre). Les messages serveur remontent via invokeEdgeFunction. */
export function useManualAction(): {
  busy: boolean
  create: (input: ManualActionInput) => Promise<{ ok: boolean; error?: string }>
  setStatus: (carId: string, status: 'open' | 'closed') => Promise<{ ok: boolean; error?: string }>
} {
  const [busy, setBusy] = useState(false)
  const create = useCallback(async (input: ManualActionInput) => {
    setBusy(true)
    const r = await invokeEdgeFunction('manage-manual-action', { action: 'create', ...input })
    setBusy(false)
    return { ok: r.ok, error: r.error }
  }, [])
  const setStatus = useCallback(async (carId: string, status: 'open' | 'closed') => {
    setBusy(true)
    const r = await invokeEdgeFunction('manage-manual-action', { action: 'set-status', car_id: carId, status })
    setBusy(false)
    return { ok: r.ok, error: r.error }
  }, [])
  return { busy, create, setStatus }
}
