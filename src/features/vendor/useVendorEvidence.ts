import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'

export interface VendorEvidence {
  id: string
  control_id: string | null
  file_path: string
  file_name: string
  created_at: string
}

const safeName = (n: string): string => n.replace(/[^a-zA-Z0-9._-]/g, '_')

/** Preuves d'une evaluation fournisseur : upload bucket documents + RPC (RFC 0020 Lot 3b). */
export function useVendorEvidence(assessmentId: string) {
  const [rows, setRows] = useState<VendorEvidence[]>([])
  const toast = useToast()

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_vendor_evidence', { p_assessment: assessmentId })
    if (error) { console.error('[useVendorEvidence]', error.message); return }
    setRows((data ?? []) as VendorEvidence[])
  }, [assessmentId])

  useEffect(() => { void load() }, [load])

  const byControl = useMemo(() => {
    const m = new Map<string, VendorEvidence[]>()
    rows.forEach((e) => { if (e.control_id) m.set(e.control_id, [...(m.get(e.control_id) ?? []), e]) })
    return m
  }, [rows])

  const upload = useCallback(async (controlId: string, file: File): Promise<void> => {
    const path = `vendor-assessments/${assessmentId}/${controlId}/${Date.now()}-${safeName(file.name)}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
    if (upErr) { toast.error('Envoi du fichier impossible', upErr.message); return }
    const { error } = await supabase.rpc('add_vendor_evidence', { p_assessment: assessmentId, p_control: controlId, p_path: path, p_name: file.name })
    if (error) { toast.error('Enregistrement impossible', error); await supabase.storage.from('documents').remove([path]); return }
    await load()
  }, [assessmentId, load, toast])

  const remove = useCallback(async (e: VendorEvidence): Promise<void> => {
    const { error } = await supabase.rpc('delete_vendor_evidence', { p_evidence: e.id })
    if (error) { toast.error('Suppression impossible', error); return }
    await supabase.storage.from('documents').remove([e.file_path])
    await load()
  }, [load, toast])

  const openFile = useCallback(async (e: VendorEvidence): Promise<void> => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(e.file_path, 120)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
  }, [])

  return { byControl, upload, remove, openFile }
}
