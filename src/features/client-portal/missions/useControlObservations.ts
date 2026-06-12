import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { AssessmentObservation } from '../../../types/database.types'

export interface ObservationWithAuthor extends AssessmentObservation {
  authorName: string | null
  responderName: string | null
}

export interface ControlObservationsApi {
  observations: ObservationWithAuthor[]
  loadingObs: boolean
  newObsText: string
  setNewObsText: (v: string) => void
  submitting: boolean
  handleSubmit: () => Promise<void>
}

/**
 * Charge + résout les auteurs des observations d'un assessment, et gère l'ajout.
 * Extrait de ControlDetailDrawer (CLAUDE.md §2). Comportement inchangé ;
 * déduplique les deux blocs de fetch identiques de l'original.
 */
export function useControlObservations(
  assessmentId: string | null,
  onObservationSubmitted: () => void,
): ControlObservationsApi {
  const [observations, setObservations] = useState<ObservationWithAuthor[]>([])
  const [newObsText, setNewObsText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingObs, setLoadingObs] = useState(true)

  // Charge les observations + noms d'auteurs. Avec signal => annulable (effet).
  const fetchObservations = useCallback(async (signal?: AbortSignal): Promise<ObservationWithAuthor[] | null> => {
    if (!assessmentId) return []
    try {
      const obsQuery = supabase
        .from('assessment_observations')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('observation_at', { ascending: true })
      const { data } = await (signal ? obsQuery.abortSignal(signal) : obsQuery)
      if (signal?.aborted) return null

      const rows = (data ?? []) as AssessmentObservation[]
      const userIds = new Set<string>()
      for (const r of rows) {
        userIds.add(r.observation_by)
        if (r.response_by) userIds.add(r.response_by)
      }

      const userMap = new Map<string, string>()
      if (userIds.size > 0) {
        const usersQuery = supabase.from('users').select('id, first_name, last_name').in('id', [...userIds])
        const { data: users } = await (signal ? usersQuery.abortSignal(signal) : usersQuery)
        if (signal?.aborted) return null
        for (const u of users ?? []) {
          userMap.set(u.id, `${u.first_name} ${u.last_name}`)
        }
      }

      return rows.map((r) => ({
        ...r,
        authorName: userMap.get(r.observation_by) ?? null,
        responderName: r.response_by ? userMap.get(r.response_by) ?? null : null,
      }))
    } catch {
      // Abort (changement de contrôle / démontage) ou erreur réseau : pas de crash
      return null
    }
  }, [assessmentId])

  useEffect(() => {
    if (!assessmentId) { setLoadingObs(false); return }
    const controller = new AbortController()
    setLoadingObs(true)
    setNewObsText('')

    fetchObservations(controller.signal).then((rows) => {
      if (rows === null || controller.signal.aborted) return
      setObservations(rows)
      setLoadingObs(false)
    })

    return () => controller.abort()
  }, [assessmentId, fetchObservations])

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!assessmentId || !newObsText.trim()) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!profile) { setSubmitting(false); return }

    const { error } = await supabase
      .from('assessment_observations')
      .insert({
        assessment_id: assessmentId,
        observation_text: newObsText.trim(),
        observation_by: (profile as { id: string }).id,
      } as never)

    setSubmitting(false)
    if (error) {
      console.error('submit observation:', error.message)
      return
    }

    setNewObsText('')
    onObservationSubmitted()
    const rows = await fetchObservations()
    if (rows) setObservations(rows)
  }, [assessmentId, newObsText, onObservationSubmitted, fetchObservations])

  return { observations, loadingObs, newObsText, setNewObsText, submitting, handleSubmit }
}
