import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'

export interface VendorFinding {
  id: string
  control_id: string | null
  control_code: string | null
  classification: string
  description: string
  risk: string | null
  recommendation: string | null
  priority: string | null
  created_at: string
}

export interface NewFinding {
  classification: string
  description: string
  control_id?: string | null
  risk?: string | null
  recommendation?: string | null
  priority?: string | null
}

/** Constats d'une evaluation fournisseur (RFC 0020 Lot 2b). */
export function useVendorFindings(assessmentId: string) {
  const [rows, setRows] = useState<VendorFinding[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_vendor_findings', { p_assessment: assessmentId })
    if (error) { console.error('[useVendorFindings]', error.message); setLoading(false); return }
    setRows((data ?? []) as VendorFinding[])
    setLoading(false)
  }, [assessmentId])

  useEffect(() => { void load() }, [load])

  const add = useCallback(async (f: NewFinding): Promise<boolean> => {
    const { error } = await supabase.rpc('add_vendor_finding', {
      p_assessment: assessmentId, p_classification: f.classification, p_description: f.description,
      p_control: f.control_id ?? undefined, p_risk: f.risk ?? undefined,
      p_recommendation: f.recommendation ?? undefined, p_priority: f.priority ?? undefined,
    })
    if (error) { toast.error('Ajout impossible', error); return false }
    await load()
    return true
  }, [assessmentId, load, toast])

  const remove = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.rpc('delete_vendor_finding', { p_finding: id })
    if (error) { toast.error('Suppression impossible', error); return }
    await load()
  }, [load, toast])

  return { rows, loading, add, remove }
}
