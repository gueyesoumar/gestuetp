import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export interface SearchHit {
  id: string
  label: string
  sublabel?: string
}

export interface HubSearchResults {
  missions: SearchHit[]
  entities: SearchHit[]
  loading: boolean
}

const MIN_CHARS = 2
const LIMIT = 6

/** Échappe les jokers ilike (%, _, \) pour une recherche littérale. */
const escapeLike = (s: string): string => s.replace(/[\\%_]/g, (c) => `\\${c}`)

/**
 * Recherche du Hub (command palette) : missions + assujettis, cloisonnés par la RLS
 * existante (missions re-scopées cabinet_id comme useMissions ; organizations via la
 * RLS de hiérarchie). Debounce + AbortController. Aucun élargissement d'accès.
 */
export function useHubSearch(query: string): HubSearchResults {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const [missions, setMissions] = useState<SearchHit[]>([])
  const [entities, setEntities] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < MIN_CHARS || !orgId) {
      setMissions([])
      setEntities([])
      setLoading(false)
      return
    }
    setLoading(true)
    const ac = new AbortController()

    const run = async (): Promise<void> => {
      const pattern = `%${escapeLike(q)}%`
      const [mRes, eRes] = await Promise.all([
        supabase.from('missions').select('id, name').eq('cabinet_id', orgId).ilike('name', pattern).limit(LIMIT).abortSignal(ac.signal),
        supabase.from('organizations').select('id, name, sector').neq('id', orgId).ilike('name', pattern).limit(LIMIT).abortSignal(ac.signal),
      ])
      if (ac.signal.aborted) return
      if (mRes.error) console.error('useHubSearch missions:', mRes.error.message)
      if (eRes.error) console.error('useHubSearch entities:', eRes.error.message)
      setMissions((mRes.data ?? []).map((m) => ({ id: m.id, label: m.name })))
      setEntities((eRes.data ?? []).map((e) => ({ id: e.id, label: e.name, sublabel: e.sector ?? undefined })))
      setLoading(false)
    }

    const timer = setTimeout(() => { void run() }, 200)
    return () => {
      ac.abort()
      clearTimeout(timer)
    }
  }, [query, orgId])

  return { missions, entities, loading }
}
