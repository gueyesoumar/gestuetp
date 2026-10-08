import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { isUnfavorablePair } from './right-rail/cadrageHint'

/**
 * Écarts probables issus du cadrage, pour TOUTE la mission (levier étage 2 — L2).
 * Renvoie l'ensemble des control_id dont au moins une réponse de cadrage liée est
 * défavorable (réponse du client ≠ réponse attendue). Vide si le référentiel n'est
 * pas mappé ou si aucune polarité n'est définie.
 */
export function useCadrageGaps(missionId: string | null, controlIds: string[]): Set<string> {
  const [gaps, setGaps] = useState<Set<string>>(new Set())
  // Clé stable pour l'effet (évite de relancer à chaque nouveau tableau).
  const idsKey = controlIds.join(',')

  useEffect(() => {
    if (!missionId || controlIds.length === 0) { setGaps(new Set()); return }
    const ac = new AbortController()

    void (async () => {
      const { data: inst } = await supabase.from('questionnaire_instances')
        .select('id').eq('mission_id', missionId).limit(1).abortSignal(ac.signal)
      if (ac.signal.aborted) return
      const instanceId = (inst ?? [])[0]?.id as string | undefined
      if (!instanceId) { setGaps(new Set()); return }

      const { data: linkRows } = await supabase.from('question_controls')
        .select('control_id, question:questions(code, expected_answer)')
        .in('control_id', controlIds)
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      const links = (linkRows ?? []) as unknown as Array<{ control_id: string; question: { code: string; expected_answer: string | null } | null }>
      const polarised = links.filter((l) => l.question?.expected_answer)
      if (polarised.length === 0) { setGaps(new Set()); return }

      const codes = Array.from(new Set(polarised.map((l) => l.question?.code).filter((c): c is string => Boolean(c))))
      const { data: respRows } = await supabase.from('questionnaire_responses')
        .select('question_code, response').eq('instance_id', instanceId).in('question_code', codes)
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      const respByCode = new Map<string, unknown>()
      for (const r of (respRows ?? []) as Array<{ question_code: string; response: { value?: unknown } | null }>) {
        respByCode.set(r.question_code, r.response?.value ?? null)
      }

      const next = new Set<string>()
      for (const l of polarised) {
        const code = l.question?.code
        if (!code || !respByCode.has(code)) continue
        if (isUnfavorablePair(l.question?.expected_answer ?? null, respByCode.get(code))) {
          next.add(l.control_id)
        }
      }
      setGaps(next)
    })()

    return () => ac.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId, idsKey])

  return gaps
}
