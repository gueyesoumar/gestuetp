import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../hooks/useAuth'
import type { FindingTemplate, FindingClassification } from '../../../../types/database.types'

export interface SaveTemplateInput {
  classification: FindingClassification
  description: string
  risks: string[]
  recommendations: string[]
}

interface UseFindingTemplatesResult {
  templates: FindingTemplate[]
  loading: boolean
  /** Enregistre un constat-type dans la bibliothèque du cabinet (ou incrémente l'usage si identique). */
  saveTemplate: (input: SaveTemplateInput) => Promise<boolean>
  refetch: () => void
}

// Lot 3 — catalogue lié : constats-types (plateforme + cabinet) rattachés à un contrôle.
// La RLS renvoie les lignes 'platform' + celles du cabinet de l'utilisateur.
export function useFindingTemplates(controlId: string | undefined): UseFindingTemplatesResult {
  const { profile } = useAuth()
  const [templates, setTemplates] = useState<FindingTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!controlId) { setLoading(false); return }
    const abort = new AbortController()
    setLoading(true)
    supabase
      .from('finding_templates')
      .select('*')
      .eq('control_id', controlId)
      .order('usage_count', { ascending: false })
      .abortSignal(abort.signal)
      .then(({ data, error }) => {
        if (abort.signal.aborted) return
        if (error) {
          console.error('useFindingTemplates:', error.message)
          setTemplates([])
        } else {
          setTemplates((data ?? []) as FindingTemplate[])
        }
        setLoading(false)
      })
    return () => abort.abort()
  }, [controlId, refreshKey])

  const saveTemplate = useCallback(async (input: SaveTemplateInput): Promise<boolean> => {
    if (!controlId || !profile) return false
    const desc = input.description.trim()
    if (!desc) return false

    // Si un constat-type identique existe déjà dans MON cabinet, on incrémente l'usage.
    const existing = templates.find(
      (t) => t.scope === 'cabinet' && t.classification === input.classification && t.description.trim() === desc,
    )
    if (existing) {
      const { error } = await supabase
        .from('finding_templates')
        .update({ usage_count: existing.usage_count + 1 })
        .eq('id', existing.id)
      if (error) { console.error('useFindingTemplates increment:', error.message); return false }
      refetch()
      return true
    }

    const { error } = await supabase.from('finding_templates').insert({
      scope: 'cabinet',
      org_id: profile.organization_id,
      control_id: controlId,
      classification: input.classification,
      description: desc,
      risks: input.risks.filter((r) => r.trim()),
      recommendations: input.recommendations.filter((r) => r.trim()),
      usage_count: 1,
      created_by: profile.id,
    })
    if (error) { console.error('useFindingTemplates insert:', error.message); return false }
    refetch()
    return true
  }, [controlId, profile, templates, refetch])

  return { templates, loading, saveTemplate, refetch }
}
