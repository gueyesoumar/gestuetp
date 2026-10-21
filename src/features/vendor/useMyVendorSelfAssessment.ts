import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import type { AssessmentControl } from './useVendorAssessment'

export interface MySelfAssessment {
  id: string
  framework_name: string
  vendor_name: string
  status: string
  created_at: string
}

/** Liste des auto-evaluations du candidat (portail, RFC 0020 Lot 3a). */
export function useMySelfAssessments() {
  const [rows, setRows] = useState<MySelfAssessment[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_my_vendor_self_assessments')
    if (error) { console.error('[useMySelfAssessments]', error.message); setLoading(false); return }
    setRows((data ?? []) as MySelfAssessment[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])
  return { rows, loading, reload: load }
}

/** Detail + saisie d'une auto-evaluation candidat. */
export function useMySelfAssessmentDetail(assessmentId: string | null) {
  const [controls, setControls] = useState<AssessmentControl[]>([])
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const load = useCallback(async () => {
    if (!assessmentId) { setControls([]); return }
    setLoading(true)
    const { data, error } = await supabase.rpc('get_my_vendor_self_assessment_detail', { p_assessment: assessmentId })
    if (error) { console.error('[useMySelfAssessmentDetail]', error.message); setLoading(false); return }
    const rows = (data ?? []) as (AssessmentControl & { status: string })[]
    setControls(rows)
    setStatus(rows[0]?.status ?? '')
    setLoading(false)
  }, [assessmentId])

  useEffect(() => { void load() }, [load])

  const setLevel = useCallback(async (controlId: string, level: string): Promise<void> => {
    if (!assessmentId) return
    setControls((prev) => prev.map((c) => c.control_id === controlId ? { ...c, conformity_level: level } : c))
    const { error } = await supabase.rpc('set_vendor_self_evaluation', { p_assessment: assessmentId, p_control: controlId, p_level: level })
    if (error) { toast.error('Enregistrement impossible', error); void load() }
  }, [assessmentId, load, toast])

  const submit = useCallback(async (): Promise<boolean> => {
    if (!assessmentId) return false
    const { error } = await supabase.rpc('submit_vendor_self_assessment', { p_assessment: assessmentId })
    if (error) { toast.error('Soumission impossible', error); return false }
    await load()
    return true
  }, [assessmentId, load, toast])

  return { controls, status, loading, setLevel, submit }
}
