import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export interface OrgSector {
  id: string
  owner_org_id: string | null
  label: string
  kind: string
  is_active: boolean
  sort_order: number | null
}

export interface SectorUsage {
  entities: number
  templates: number
  assignments: number
}

interface UseOrgSectorsResult {
  own: OrgSector[]
  inherited: OrgSector[]
  loading: boolean
  error: string | null
  reload: () => void
  create: (label: string) => Promise<boolean>
  rename: (id: string, label: string) => Promise<boolean>
  setActive: (id: string, active: boolean) => Promise<boolean>
  fetchUsage: (label: string) => Promise<SectorUsage | null>
  reassign: (from: string, to: string) => Promise<boolean>
}

/**
 * Gestion des secteurs de l'org courante (RFC 0022, Lot 2). Lecture via le RPC
 * `get_sectors` (inclut inactifs) ; écritures directes sur `org_sectors` (la RLS `os_write`
 * exige la permission `can_manage_sectors`). La désactivation guidée avec réaffectation est
 * le Lot 3 : ici `setActive` bascule simplement `is_active`.
 */
export function useOrgSectors(): UseOrgSectorsResult {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [rows, setRows] = useState<OrgSector[]>([])
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
        .rpc('get_sectors', { p_include_inactive: true })
        .abortSignal(ac.signal)
      if (!active) return
      if (err) {
        console.error('[useOrgSectors]', err.message)
        setError('Chargement des secteurs impossible')
        setRows([])
      } else {
        setRows((data ?? []) as OrgSector[])
      }
      setLoading(false)
    })()
    return () => {
      active = false
      ac.abort()
    }
  }, [key, orgId])

  const create = useCallback(async (label: string): Promise<boolean> => {
    const trimmed = label.trim()
    if (!orgId || !trimmed) return false
    const { error: e } = await supabase.from('org_sectors').insert({
      owner_org_id: orgId, label: trimmed, kind: 'generic', created_by: profile?.id ?? null,
    } as never)
    if (e) { console.error('[useOrgSectors.create]', e.message); return false }
    reload()
    return true
  }, [orgId, profile?.id, reload])

  const rename = useCallback(async (id: string, label: string): Promise<boolean> => {
    const trimmed = label.trim()
    if (!trimmed) return false
    const { error: e } = await supabase.from('org_sectors').update({ label: trimmed } as never).eq('id', id)
    if (e) { console.error('[useOrgSectors.rename]', e.message); return false }
    reload()
    return true
  }, [reload])

  const setActive = useCallback(async (id: string, activeState: boolean): Promise<boolean> => {
    const { error: e } = await supabase.from('org_sectors').update({ is_active: activeState } as never).eq('id', id)
    if (e) { console.error('[useOrgSectors.setActive]', e.message); return false }
    reload()
    return true
  }, [reload])

  const fetchUsage = useCallback(async (label: string): Promise<SectorUsage | null> => {
    const { data, error: e } = await supabase.rpc('get_sector_usage', { p_label: label })
    if (e) { console.error('[useOrgSectors.fetchUsage]', e.message); return null }
    const row = (data ?? [])[0] as SectorUsage | undefined
    return row ?? { entities: 0, templates: 0, assignments: 0 }
  }, [])

  const reassign = useCallback(async (from: string, to: string): Promise<boolean> => {
    const { error: e } = await supabase.rpc('reassign_sector', { p_from: from, p_to: to })
    if (e) { console.error('[useOrgSectors.reassign]', e.message); return false }
    reload()
    return true
  }, [reload])

  const own = rows.filter((r) => orgId !== null && r.owner_org_id === orgId)
  const inherited = rows.filter((r) => r.owner_org_id !== orgId)
  return { own, inherited, loading, error, reload, create, rename, setActive, fetchUsage, reassign }
}
