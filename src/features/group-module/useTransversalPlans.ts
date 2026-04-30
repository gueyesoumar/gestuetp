import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { CorrectiveActionRequest } from '../../types/database.types'

export interface TransversalCAR extends CorrectiveActionRequest {
  subsidiary_id: string | null
  subsidiary_name: string | null
  mission_name: string | null
  mission_kind: 'audit' | 'continuous_supervision'
}

interface UseTransversalPlansResult {
  cars: TransversalCAR[]
  loading: boolean
  totalOpen: number
  totalToVerify: number
  totalOverdue: number
  totalClosed: number
}

export function useTransversalPlans(): UseTransversalPlansResult {
  const { profile } = useAuth()
  const [cars, setCars] = useState<TransversalCAR[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.organization_id) return
    const ac = new AbortController()
    setLoading(true)

    const load = async (): Promise<void> => {
      // 1. Filiales
      const { data: subs } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('parent_org_id', profile.organization_id)
      if (ac.signal.aborted) return
      const subList = (subs ?? []) as Array<{ id: string; name: string }>
      const subMap = new Map(subList.map((s) => [s.id, s.name]))
      if (subList.length === 0) {
        setCars([])
        setLoading(false)
        return
      }

      // 2. Missions sur filiales
      const { data: missions } = await supabase
        .from('missions')
        .select('id, name, client_id, kind')
        .in('client_id', subList.map((s) => s.id))
      if (ac.signal.aborted) return
      const missionList = (missions ?? []) as Array<{ id: string; name: string; client_id: string | null; kind: 'audit' | 'continuous_supervision' }>
      const missionMap = new Map(missionList.map((m) => [m.id, m]))
      const missionIds = missionList.map((m) => m.id)
      if (missionIds.length === 0) {
        setCars([])
        setLoading(false)
        return
      }

      // 3. CAR sur ces missions
      const { data: rows } = await supabase
        .from('corrective_action_requests')
        .select('*')
        .in('mission_id', missionIds)
        .order('code', { ascending: true })
      if (ac.signal.aborted) return

      const enriched: TransversalCAR[] = ((rows ?? []) as CorrectiveActionRequest[]).map((c) => {
        const m = missionMap.get(c.mission_id)
        return {
          ...c,
          subsidiary_id: m?.client_id ?? null,
          subsidiary_name: m?.client_id ? subMap.get(m.client_id) ?? null : null,
          mission_name: m?.name ?? null,
          mission_kind: m?.kind ?? 'audit',
        }
      })
      setCars(enriched)
      setLoading(false)
    }

    void load()
    return () => ac.abort()
  }, [profile?.organization_id])

  const today = new Date().toISOString().slice(0, 10)
  const totalOpen = cars.filter((c) => c.status === 'open').length
  const totalToVerify = cars.filter((c) => c.status === 'client_responded').length
  const totalClosed = cars.filter((c) => c.status === 'verified' || c.status === 'closed').length
  const totalOverdue = cars.filter((c) => {
    if (c.status === 'verified' || c.status === 'closed') return false
    const due = c.client_target_date ?? c.deadline
    return due !== null && due < today
  }).length

  return { cars, loading, totalOpen, totalToVerify, totalOverdue, totalClosed }
}
