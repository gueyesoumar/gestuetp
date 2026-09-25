import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { DISCOVERY_STEPS } from './demoTours'
import type { DiscoveryStep } from './demoTours'

// Progression du parcours de découverte, persistée dans onboarding_tours_seen
// (RLS user-owned, réutilisée). Une étape est « vue » dès qu'elle est lancée.
export interface DemoDiscoveryState {
  steps: DiscoveryStep[]
  seen: Set<string>
  doneCount: number
  total: number
  loading: boolean
  markSeen: (tourId: string) => Promise<void>
}

export function useDemoDiscovery(): DemoDiscoveryState {
  const { profile } = useAuth()
  const uid = profile?.id ?? null
  const [seen, setSeen] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ac = new AbortController()
    void (async () => {
      if (!uid) { setLoading(false); return }
      const ids = DISCOVERY_STEPS.map((s) => s.id)
      const { data, error } = await supabase
        .from('onboarding_tours_seen')
        .select('tour_id')
        .eq('user_id', uid)
        .in('tour_id', ids)
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (error) console.warn('[demo-discovery]', error.message)
      else if (data) setSeen(new Set((data as { tour_id: string }[]).map((r) => r.tour_id)))
      setLoading(false)
    })()
    return () => ac.abort()
  }, [uid])

  const markSeen = useCallback(async (tourId: string): Promise<void> => {
    setSeen((prev) => new Set(prev).add(tourId))
    if (!uid) return
    const { error } = await supabase
      .from('onboarding_tours_seen')
      .upsert({ user_id: uid, tour_id: tourId }, { onConflict: 'user_id,tour_id' })
    if (error) console.warn('[demo-discovery] markSeen:', error.message)
  }, [uid])

  const doneCount = DISCOVERY_STEPS.filter((s) => seen.has(s.id)).length
  return { steps: DISCOVERY_STEPS, seen, doneCount, total: DISCOVERY_STEPS.length, loading, markSeen }
}
