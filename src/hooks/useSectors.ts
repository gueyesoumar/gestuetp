import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface SectorOption {
  id: string
  owner_org_id: string | null
  label: string
  kind: string
  is_active: boolean
  sort_order: number | null
}

interface UseSectorsResult {
  sectors: SectorOption[]
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Secteurs visibles par l'organisation courante (RFC 0022, Lot 2) : plateforme +
 * ceux de ma propre org + ceux de mon régulateur, résolus via le RPC SECURITY DEFINER
 * `get_sectors`. Secteurs actifs par défaut ; `includeInactive` pour les écrans de gestion.
 */
export function useSectors(includeInactive = false): UseSectorsResult {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [sectors, setSectors] = useState<SectorOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)
  const reload = useCallback((): void => setKey((k) => k + 1), [])

  useEffect(() => {
    const ac = new AbortController()
    let active = true
    setLoading(true)
    setError(null)
    void (async () => {
      const { data, error: err } = await supabase
        .rpc('get_sectors', { p_include_inactive: includeInactive })
        .abortSignal(ac.signal)
      if (!active) return
      if (err) {
        console.error('[useSectors]', err.message)
        setError('Chargement des secteurs impossible')
        setSectors([])
      } else {
        setSectors((data ?? []) as SectorOption[])
      }
      setLoading(false)
    })()
    return () => {
      active = false
      ac.abort()
    }
  }, [includeInactive, key, orgId])

  return { sectors, loading, error, reload }
}
