import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { normalizeAnswer } from '../fieldwork/right-rail/cadrageHint'

export interface ScopeSuggestion {
  control_id: string
  question_code: string
  question_text: string
}

/**
 * Suggestions d'exclusion de périmètre issues du cadrage (levier L4). Pour les
 * questions dont la réponse du client vaut `scope_exclude_value`, on propose
 * d'exclure les contrôles liés (question_controls). L'auditeur valide dans l'onglet
 * Cadrage (périmètre). Vide si aucune règle n'est définie ou aucune réponse ne matche.
 */
export function useCadrageScopeSuggestions(missionId: string | undefined) {
  const [suggestions, setSuggestions] = useState<ScopeSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!missionId) { setSuggestions([]); setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)

    void (async () => {
      const { data: inst } = await supabase.from('questionnaire_instances')
        .select('id').eq('mission_id', missionId).limit(1).abortSignal(ac.signal)
      if (ac.signal.aborted) return
      const instanceId = (inst ?? [])[0]?.id as string | undefined
      if (!instanceId) { setSuggestions([]); setLoading(false); return }

      // Questions porteuses d'une règle de périmètre + leurs contrôles liés.
      const { data: linkRows } = await supabase.from('question_controls')
        .select('control_id, question:questions(code, text, scope_exclude_value)')
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      const links = (linkRows ?? []) as unknown as Array<{ control_id: string; question: { code: string; text: string; scope_exclude_value: string | null } | null }>
      const ruled = links.filter((l) => l.question?.scope_exclude_value)
      if (ruled.length === 0) { setSuggestions([]); setLoading(false); return }

      const codes = Array.from(new Set(ruled.map((l) => l.question?.code).filter((c): c is string => Boolean(c))))
      const { data: respRows } = await supabase.from('questionnaire_responses')
        .select('question_code, response').eq('instance_id', instanceId).in('question_code', codes)
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      const respByCode = new Map<string, unknown>()
      for (const r of (respRows ?? []) as Array<{ question_code: string; response: { value?: unknown } | null }>) {
        respByCode.set(r.question_code, r.response?.value ?? null)
      }

      const byControl = new Map<string, ScopeSuggestion>()
      for (const l of ruled) {
        const code = l.question?.code
        const trigger = l.question?.scope_exclude_value
        if (!code || !trigger || !respByCode.has(code)) continue
        if (normalizeAnswer(respByCode.get(code)) === normalizeAnswer(trigger) && !byControl.has(l.control_id)) {
          byControl.set(l.control_id, { control_id: l.control_id, question_code: code, question_text: l.question?.text ?? '' })
        }
      }
      setSuggestions([...byControl.values()])
      setLoading(false)
    })()

    return () => ac.abort()
  }, [missionId, refreshKey])

  return { suggestions, loading, refetch }
}
