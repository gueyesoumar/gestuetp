import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { ClientContact, ClientContactInsert, ClientContactUpdate } from '../../../types/database.types'

interface UseMissionActorsResult {
  actors: ClientContact[]
  loading: boolean
  error: string | null
  saving: boolean
  add: (data: Omit<ClientContactInsert, 'mission_id'>) => Promise<ClientContact | null>
  update: (id: string, patch: ClientContactUpdate) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
  refetch: () => void
}

// CRUD sur client_contacts pour une mission. Ces "acteurs" sont les
// interlocuteurs SI a rencontrer pendant les entretiens de la phase 4.
// Phase B de la refonte des Entretiens.
export function useMissionActors(missionId: string | null | undefined): UseMissionActorsResult {
  const [actors, setActors] = useState<ClientContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!missionId) { setActors([]); setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    void (async () => {
      const { data, error: qErr } = await supabase
        .from('client_contacts')
        .select('id, mission_id, name, job_title, department, email, phone, is_primary, created_at')
        .eq('mission_id', missionId)
        .order('is_primary', { ascending: false })
        .order('name')
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (qErr) {
        console.error('[useMissionActors] list:', qErr.message)
        setError('Erreur lors du chargement des acteurs')
        setActors([])
      } else {
        setActors((data ?? []) as ClientContact[])
      }
      setLoading(false)
    })()
    return () => ac.abort()
  }, [missionId, tick])

  const add = useCallback(async (data: Omit<ClientContactInsert, 'mission_id'>): Promise<ClientContact | null> => {
    if (!missionId) return null
    setSaving(true)
    const { data: row, error: insErr } = await supabase
      .from('client_contacts')
      .insert({ ...data, mission_id: missionId })
      .select('id, mission_id, name, job_title, department, email, phone, is_primary, created_at')
      .single()
    setSaving(false)
    if (insErr) {
      console.error('[useMissionActors] add:', insErr.message)
      setError('Erreur lors de l’ajout')
      return null
    }
    refetch()
    return row as ClientContact
  }, [missionId, refetch])

  const update = useCallback(async (id: string, patch: ClientContactUpdate): Promise<boolean> => {
    setSaving(true)
    const { error: upErr } = await supabase
      .from('client_contacts')
      .update(patch)
      .eq('id', id)
    setSaving(false)
    if (upErr) {
      console.error('[useMissionActors] update:', upErr.message)
      setError('Erreur lors de la mise à jour')
      return false
    }
    refetch()
    return true
  }, [refetch])

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true)
    const { error: delErr } = await supabase
      .from('client_contacts')
      .delete()
      .eq('id', id)
    setSaving(false)
    if (delErr) {
      console.error('[useMissionActors] remove:', delErr.message)
      setError('Erreur lors de la suppression')
      return false
    }
    refetch()
    return true
  }, [refetch])

  return { actors, loading, error, saving, add, update, remove, refetch }
}
