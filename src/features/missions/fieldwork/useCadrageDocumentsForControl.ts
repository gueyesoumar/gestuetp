import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export interface CadrageDocument {
  id: string
  file_name: string
  file_path: string
  question_code: string
}

/**
 * Documents déposés au cadrage (tag [CADRAGE:<code>]) pour les questions liées à CE
 * contrôle, et pas encore rattachés à une preuve (evidence_item_id null). Permet de
 * les réutiliser comme preuve d'un contrôle (levier L3) au lieu de redemander au client.
 */
export function useCadrageDocumentsForControl(missionId: string | undefined, controlId: string | undefined) {
  const [docs, setDocs] = useState<CadrageDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!missionId || !controlId) { setDocs([]); setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)

    void (async () => {
      const { data: links } = await supabase.from('question_controls')
        .select('question:questions(code)').eq('control_id', controlId).abortSignal(ac.signal)
      if (ac.signal.aborted) return
      const codes = Array.from(new Set(
        ((links ?? []) as unknown as Array<{ question: { code: string } | null }>)
          .map((l) => l.question?.code).filter((c): c is string => Boolean(c)),
      ))
      if (codes.length === 0) { setDocs([]); setLoading(false); return }

      const tags = codes.map((c) => `[CADRAGE:${c}]`)
      const { data: rows } = await supabase.from('documents')
        .select('id, file_name, file_path, description')
        .eq('mission_id', missionId)
        .is('evidence_item_id', null)
        .in('description', tags)
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      const tagToCode = (desc: string | null): string => (desc ?? '').replace(/^\[CADRAGE:/, '').replace(/\]$/, '')
      setDocs(((rows ?? []) as Array<{ id: string; file_name: string; file_path: string; description: string | null }>)
        .map((r) => ({ id: r.id, file_name: r.file_name, file_path: r.file_path, question_code: tagToCode(r.description) })))
      setLoading(false)
    })()

    return () => ac.abort()
  }, [missionId, controlId, refreshKey])

  /** Rattache un document de cadrage à une preuve canonique (le marque comme fourni). */
  const attach = useCallback(async (documentId: string, evidenceItemId: string): Promise<boolean> => {
    const { error } = await supabase.from('documents').update({ evidence_item_id: evidenceItemId }).eq('id', documentId)
    if (error) { console.error('[cadrage-attach]', error.message); return false }
    return true
  }, [])

  return { docs, loading, attach, refetch }
}
