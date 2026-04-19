import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { MissionRiskInsert, MissionExclusionInsert } from '../../../types/database.types'

interface UseSaveScopingResult {
  saveMissionFields: (missionId: string, fields: { audit_objectives?: string; audit_criteria?: string; scoping_notes?: string }) => Promise<boolean>
  addExclusion: (data: MissionExclusionInsert) => Promise<boolean>
  removeExclusion: (id: string) => Promise<boolean>
  addRisk: (data: MissionRiskInsert) => Promise<boolean>
  updateRisk: (id: string, data: Partial<MissionRiskInsert>) => Promise<boolean>
  removeRisk: (id: string) => Promise<boolean>
  saving: boolean
  error: string | null
}

// All mutations use raw fetch to bypass Supabase client type issues with new tables
async function supabaseRpc(table: string, method: 'POST' | 'PATCH' | 'DELETE', body?: Record<string, unknown>, filter?: string): Promise<{ error: string | null }> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/${table}${filter ? `?${filter}` : ''}`
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token

  console.log(`[supabaseRpc] ${method} ${table}`, { body, filter, hasToken: !!token })

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`[supabaseRpc] ERREUR ${method} ${table}: ${res.status}`, text)
    return { error: text }
  }
  console.log(`[supabaseRpc] OK ${method} ${table}`)
  return { error: null }
}

export function useSaveScoping(onSuccess?: () => void): UseSaveScopingResult {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveMissionFields = useCallback(async (missionId: string, fields: { audit_objectives?: string; audit_criteria?: string; scoping_notes?: string }): Promise<boolean> => {
    setSaving(true)
    setError(null)
    const { error: err } = await supabaseRpc('missions', 'PATCH', fields, `id=eq.${missionId}`)
    if (err) { setError('Erreur lors de la sauvegarde.'); setSaving(false); return false }
    setSaving(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  const addExclusion = useCallback(async (data: MissionExclusionInsert): Promise<boolean> => {
    setSaving(true)
    setError(null)
    const { error: err } = await supabaseRpc('mission_exclusions', 'POST', data as unknown as Record<string, unknown>)
    if (err) { setError('Erreur lors de l\u2019ajout de l\u2019exclusion.'); setSaving(false); return false }
    setSaving(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  const removeExclusion = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true)
    setError(null)
    const { error: err } = await supabaseRpc('mission_exclusions', 'DELETE', undefined, `id=eq.${id}`)
    if (err) { setError('Erreur lors de la suppression.'); setSaving(false); return false }
    setSaving(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  const addRisk = useCallback(async (data: MissionRiskInsert): Promise<boolean> => {
    setSaving(true)
    setError(null)
    const { error: err } = await supabaseRpc('mission_risks', 'POST', data as unknown as Record<string, unknown>)
    if (err) { setError('Erreur lors de l\u2019ajout du risque.'); setSaving(false); return false }
    setSaving(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  const updateRisk = useCallback(async (id: string, data: Partial<MissionRiskInsert>): Promise<boolean> => {
    setSaving(true)
    setError(null)
    const { error: err } = await supabaseRpc('mission_risks', 'PATCH', data as unknown as Record<string, unknown>, `id=eq.${id}`)
    if (err) { setError('Erreur lors de la mise \u00e0 jour.'); setSaving(false); return false }
    setSaving(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  const removeRisk = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true)
    setError(null)
    const { error: err } = await supabaseRpc('mission_risks', 'DELETE', undefined, `id=eq.${id}`)
    if (err) { setError('Erreur lors de la suppression.'); setSaving(false); return false }
    setSaving(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  return { saveMissionFields, addExclusion, removeExclusion, addRisk, updateRisk, removeRisk, saving, error }
}
