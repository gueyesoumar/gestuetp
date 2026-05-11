import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { isGroupOrg, isCabinetOrg, isClientOrg, isSubsidiaryOrg } from '../lib/organization-utils'
import type { Organization } from '../types/database.types'

interface SubsidiaryInfo {
  id: string
  name: string
  sector: string | null
  city: string | null
}

export interface OrganizationHierarchy {
  /** L'organisation courante */
  organization: Organization | null
  /** Est-ce un groupe (superviseur) ? */
  isGroup: boolean
  /** Est-ce un cabinet (peut auditer) ? */
  isCabinet: boolean
  /** Est-ce un client ? */
  isClient: boolean
  /** Est-ce une filiale rattachée à un groupe ? */
  isSubsidiary: boolean
  /** Organisation parente (si filiale) */
  parentOrg: Pick<Organization, 'id' | 'name'> | null
  /** Filiales (si groupe) */
  subsidiaries: SubsidiaryInfo[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useOrganizationHierarchy(orgId: string | undefined): OrganizationHierarchy {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [parentOrg, setParentOrg] = useState<Pick<Organization, 'id' | 'name'> | null>(null)
  const [subsidiaries, setSubsidiaries] = useState<SubsidiaryInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const fetchHierarchy = async (): Promise<void> => {
      // 1. Fetch the organization itself
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .abortSignal(controller.signal)
        .single()

      if (controller.signal.aborted) return
      if (orgErr || !org) {
        setError('Organisation introuvable.')
        setLoading(false)
        return
      }

      const typedOrg = org as Organization
      setOrganization(typedOrg)

      // 2. If subsidiary, fetch parent
      if (isSubsidiaryOrg(typedOrg) && typedOrg.parent_org_id) {
        const { data: parent } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', typedOrg.parent_org_id)
          .abortSignal(controller.signal)
          .single()

        if (controller.signal.aborted) return
        if (parent) {
          setParentOrg(parent as Pick<Organization, 'id' | 'name'>)
        }
      } else {
        setParentOrg(null)
      }

      // 3. If group, fetch subsidiaries via the SECURITY DEFINER function
      if (isGroupOrg(typedOrg)) {
        const { data: subIds, error: subErr } = await supabase
          .rpc('get_subsidiary_ids', { parent_id: orgId })
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return

        if (!subErr && subIds && (subIds as string[]).length > 0) {
          const ids = subIds as string[]
          const { data: subs } = await supabase
            .from('organizations')
            .select('id, name, sector, city')
            .in('id', ids)
            .order('name')
            .abortSignal(controller.signal)

          if (controller.signal.aborted) return
          if (subs) {
            setSubsidiaries(subs as SubsidiaryInfo[])
          }
        } else {
          setSubsidiaries([])
        }
      } else {
        setSubsidiaries([])
      }

      setLoading(false)
    }

    fetchHierarchy()
    return () => controller.abort()
  }, [orgId, refreshKey])

  return {
    organization,
    isGroup: organization ? isGroupOrg(organization) : false,
    isCabinet: organization ? isCabinetOrg(organization) : false,
    isClient: organization ? isClientOrg(organization) : false,
    isSubsidiary: organization ? isSubsidiaryOrg(organization) : false,
    parentOrg,
    subsidiaries,
    loading,
    error,
    refetch,
  }
}
