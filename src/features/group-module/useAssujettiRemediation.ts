import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface FindingRow {
  id: string
  classification: string
  description: string
  priority: string | null
  controlCode: string | null
}

export interface CarRow {
  id: string
  code: string
  classification: string
  controlCode: string | null
  description: string
  status: string
  verificationStatus: string
  due: string | null
}

/**
 * Remédiation d'un assujetti (Regul) : constats (assessment_findings via les
 * assessments de ses missions) + plans d'action (CAR de mission + CAR manuelles
 * entity_id). Tout scopé par la RLS existante. Passer entityId=undefined pour ne
 * rien charger (capacité measures absente).
 */
export function useAssujettiRemediation(missionIds: string[], entityId: string | undefined): { findings: FindingRow[]; cars: CarRow[]; loading: boolean } {
  const [findings, setFindings] = useState<FindingRow[]>([])
  const [cars, setCars] = useState<CarRow[]>([])
  const [loading, setLoading] = useState(true)
  const key = missionIds.join(',')

  useEffect(() => {
    if (!entityId) { setFindings([]); setCars([]); setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    const ids = key ? key.split(',') : []

    const load = async (): Promise<void> => {
      // --- Constats ---
      let findingRows: FindingRow[] = []
      if (ids.length > 0) {
        const { data: assess, error: aErr } = await supabase.from('control_assessments').select('id, control_id').in('mission_id', ids).abortSignal(ac.signal)
        if (aErr) console.error('[useAssujettiRemediation] assessments:', aErr.message)
        const assessList = (assess ?? []) as Array<{ id: string; control_id: string }>
        const ctrlOf = new Map(assessList.map((a) => [a.id, a.control_id]))
        const assessIds = assessList.map((a) => a.id)
        if (assessIds.length > 0) {
          const { data: fnds, error: fErr } = await supabase.from('assessment_findings').select('id, assessment_id, classification, description, priority').in('assessment_id', assessIds).abortSignal(ac.signal)
          if (fErr) console.error('[useAssujettiRemediation] findings:', fErr.message)
          const fList = (fnds ?? []) as Array<{ id: string; assessment_id: string; classification: string; description: string; priority: string | null }>
          const ctrlIds = Array.from(new Set(fList.map((f) => ctrlOf.get(f.assessment_id)).filter(Boolean) as string[]))
          const codeOf = new Map<string, string>()
          if (ctrlIds.length > 0) {
            const { data: ctrls } = await supabase.from('controls').select('id, code').in('id', ctrlIds).abortSignal(ac.signal)
            for (const c of (ctrls ?? []) as Array<{ id: string; code: string }>) codeOf.set(c.id, c.code)
          }
          findingRows = fList.map((f) => ({ id: f.id, classification: f.classification, description: f.description, priority: f.priority, controlCode: codeOf.get(ctrlOf.get(f.assessment_id) ?? '') ?? null }))
        }
      }
      if (ac.signal.aborted) return

      // --- Plans d'action (CAR de mission + manuelles) ---
      const sel = 'id, code, finding_classification, control_code, description, status, verification_status, deadline, client_target_date'
      type CarRaw = { id: string; code: string; finding_classification: string; control_code: string | null; description: string; status: string; verification_status: string; deadline: string | null; client_target_date: string | null }
      const raw: CarRaw[] = []
      if (ids.length > 0) {
        const { data: mc, error: mcErr } = await supabase.from('corrective_action_requests').select(sel).in('mission_id', ids).abortSignal(ac.signal)
        if (mcErr) console.error('[useAssujettiRemediation] CAR mission:', mcErr.message)
        raw.push(...((mc ?? []) as CarRaw[]))
      }
      const { data: xc, error: xcErr } = await supabase.from('corrective_action_requests').select(sel).eq('entity_id', entityId).abortSignal(ac.signal)
      if (xcErr) console.error('[useAssujettiRemediation] CAR manuel:', xcErr.message)
      raw.push(...((xc ?? []) as CarRaw[]))
      if (ac.signal.aborted) return

      const seen = new Set<string>()
      const carRows: CarRow[] = []
      for (const c of raw) {
        if (seen.has(c.id)) continue
        seen.add(c.id)
        carRows.push({ id: c.id, code: c.code, classification: c.finding_classification, controlCode: c.control_code, description: c.description, status: c.status, verificationStatus: c.verification_status, due: c.client_target_date ?? c.deadline })
      }

      setFindings(findingRows)
      setCars(carRows)
      setLoading(false)
    }

    void load()
    return () => ac.abort()
  }, [key, entityId])

  return { findings, cars, loading }
}
