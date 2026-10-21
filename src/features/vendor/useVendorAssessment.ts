import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'

export interface VendorAssessment {
  id: string
  framework_id: string
  framework_name: string
  status: string
  score: number | null
  verdict: string | null
  assessed_at: string | null
  valid_until: string | null
  created_at: string
}

export interface AssessmentControl {
  control_id: string
  control_code: string
  control_name: string
  domain_code: string
  domain_name: string
  dimension: string | null
  conformity_level: string | null
}

export interface FrameworkOption { id: string; name: string }

/** Evaluations d'un fournisseur + catalogue des referentiels (RFC 0020 Lot 2). */
export function useVendorAssessments(relationshipId: string) {
  const [rows, setRows] = useState<VendorAssessment[]>([])
  const [frameworks, setFrameworks] = useState<FrameworkOption[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const load = useCallback(async () => {
    const [{ data, error }, { data: fw }] = await Promise.all([
      supabase.rpc('get_vendor_assessments', { p_relationship: relationshipId }),
      supabase.from('frameworks').select('id, name').eq('is_active', true).order('name'),
    ])
    if (error) { console.error('[useVendorAssessments]', error.message); setLoading(false); return }
    setRows((data ?? []) as VendorAssessment[])
    setFrameworks((fw ?? []) as FrameworkOption[])
    setLoading(false)
  }, [relationshipId])

  useEffect(() => { void load() }, [load])

  const create = useCallback(async (frameworkId: string): Promise<string | null> => {
    const { data, error } = await supabase.rpc('create_vendor_assessment', { p_relationship: relationshipId, p_framework: frameworkId })
    if (error) { toast.error('Création impossible', error); return null }
    await load()
    return data as string
  }, [relationshipId, load, toast])

  return { rows, frameworks, loading, create, reload: load }
}

/** Detail (controles + cotation) d'une evaluation + actions. */
export function useAssessmentDetail(assessmentId: string | null) {
  const [controls, setControls] = useState<AssessmentControl[]>([])
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const load = useCallback(async () => {
    if (!assessmentId) { setControls([]); return }
    setLoading(true)
    const { data, error } = await supabase.rpc('get_vendor_assessment_detail', { p_assessment: assessmentId })
    if (error) { console.error('[useAssessmentDetail]', error.message); setLoading(false); return }
    setControls((data ?? []) as AssessmentControl[])
    setLoading(false)
  }, [assessmentId])

  useEffect(() => { void load() }, [load])

  const setLevel = useCallback(async (controlId: string, level: string): Promise<void> => {
    if (!assessmentId) return
    setControls((prev) => prev.map((c) => c.control_id === controlId ? { ...c, conformity_level: level } : c))
    const { error } = await supabase.rpc('set_vendor_evaluation', { p_assessment: assessmentId, p_control: controlId, p_level: level })
    if (error) { toast.error('Cotation impossible', error); void load() }
  }, [assessmentId, load, toast])

  const close = useCallback(async (validMonths: number): Promise<{ score: number; verdict: string } | null> => {
    if (!assessmentId) return null
    const { data, error } = await supabase.rpc('close_vendor_assessment', { p_assessment: assessmentId, p_valid_months: validMonths })
    if (error) { toast.error('Clôture impossible', error); return null }
    const r = (data as { score: number; verdict: string }[])?.[0] ?? null
    return r
  }, [assessmentId, toast])

  return { controls, loading, setLevel, close, reload: load }
}
