import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction'

/**
 * Bac à sable de démonstration (E4), PAR UTILISATEUR. Détecte si l'utilisateur
 * courant possède déjà une démo, et pilote sa création / suppression via les
 * edges seed-demo-data / delete-demo-data.
 */
export type DemoVariant = 'guided' | 'prefilled'

export interface DemoSandbox {
  loading: boolean
  hasDemo: boolean
  seeding: boolean
  deleting: boolean
  seed: (variant: DemoVariant) => Promise<boolean>
  teardown: () => Promise<boolean>
}

export function useDemoSandbox(): DemoSandbox {
  const { profile } = useAuth()
  const uid = profile?.id ?? null
  const [hasDemo, setHasDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      if (!uid) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('cabinet_clients')
        .select('id')
        .eq('is_demo', true)
        .eq('demo_owner_id', uid)
        .abortSignal(controller.signal)
        .maybeSingle()
      if (controller.signal.aborted) return
      if (error) {
        console.error('useDemoSandbox:', error.message)
        setLoading(false)
        return
      }
      setHasDemo(!!data)
      setLoading(false)
    })()
    return () => controller.abort()
  }, [uid, refreshKey])

  const seed = useCallback(async (variant: DemoVariant): Promise<boolean> => {
    setSeeding(true)
    const res = await invokeEdgeFunction('seed-demo-data', { variant })
    setSeeding(false)
    if (!res.ok) {
      console.error('seed-demo-data:', res.error)
      return false
    }
    setRefreshKey((k) => k + 1)
    return true
  }, [])

  const teardown = useCallback(async (): Promise<boolean> => {
    setDeleting(true)
    const res = await invokeEdgeFunction('delete-demo-data', {})
    setDeleting(false)
    if (!res.ok) {
      console.error('delete-demo-data:', res.error)
      return false
    }
    setRefreshKey((k) => k + 1)
    return true
  }, [])

  return { loading, hasDemo, seeding, deleting, seed, teardown }
}
