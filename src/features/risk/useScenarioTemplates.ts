import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export interface TemplateNode { node_type: 'cause' | 'consequence'; label: string; position: number }

export interface ScenarioTemplateRow {
  id: string
  sectors: string[]
  title: string
  dimension: string | null
  suggested_likelihood: number
  suggested_impact: number
  vulnerability: string | null
  is_active: boolean
}

export interface TemplateInput {
  title: string
  sectors: string[]
  dimension: string | null
  suggested_likelihood: number
  suggested_impact: number
  vulnerability: string | null
  is_active: boolean
  nodes: TemplateNode[]
}

interface Result {
  templates: ScenarioTemplateRow[]
  loading: boolean
  error: string | null
  save: (input: TemplateInput, id?: string) => Promise<{ ok: boolean; error?: string }>
  remove: (id: string) => Promise<void>
  loadNodes: (id: string) => Promise<TemplateNode[]>
  refetch: () => void
}

/** CRUD des modèles de scénarios propres à mon org (catalogue régulateur). */
export function useScenarioTemplates(): Result {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [templates, setTemplates] = useState<ScenarioTemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)
  const refetch = useCallback(() => setKey((k) => k + 1), [])

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    const ac = new AbortController()
    setLoading(true); setError(null)
    void (async () => {
      const { data, error: e } = await supabase
        .from('risk_scenario_templates')
        .select('id,sectors,title,dimension,suggested_likelihood,suggested_impact,vulnerability,is_active')
        .eq('owner_org_id', orgId).order('title').abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (e) { console.error('[useScenarioTemplates]', e.message); setError('Chargement des modèles impossible.'); setLoading(false); return }
      setTemplates((data ?? []) as unknown as ScenarioTemplateRow[])
      setLoading(false)
    })()
    return () => ac.abort()
  }, [orgId, key])

  const save = useCallback(async (input: TemplateInput, id?: string) => {
    if (!orgId) return { ok: false, error: 'Organisation inconnue.' }
    const payload = {
      owner_org_id: orgId, title: input.title, sectors: input.sectors,
      dimension: input.dimension, suggested_likelihood: input.suggested_likelihood,
      suggested_impact: input.suggested_impact, vulnerability: input.vulnerability,
      is_active: input.is_active, created_by: profile?.id ?? null,
    }
    let templateId = id
    if (id) {
      const { error: e } = await supabase.from('risk_scenario_templates').update(payload as never).eq('id', id)
      if (e) { console.error('[template update]', e.message); return { ok: false, error: 'Enregistrement impossible.' } }
    } else {
      const { data, error: e } = await supabase.from('risk_scenario_templates').insert(payload as never).select('id').single()
      if (e) { console.error('[template insert]', e.message); return { ok: false, error: 'Création impossible.' } }
      templateId = (data as unknown as { id: string }).id
    }
    if (!templateId) return { ok: false, error: 'Création impossible.' }
    // Remplace les nodes (simple et fiable).
    await supabase.from('risk_scenario_template_nodes').delete().eq('template_id', templateId)
    if (input.nodes.length > 0) {
      const rows = input.nodes.map((n, i) => ({ template_id: templateId, node_type: n.node_type, label: n.label, position: i }))
      const { error: ne } = await supabase.from('risk_scenario_template_nodes').insert(rows as never)
      if (ne) { console.error('[template nodes]', ne.message) }
    }
    refetch()
    return { ok: true }
  }, [orgId, profile?.id, refetch])

  const remove = useCallback(async (id: string) => {
    const { error: e } = await supabase.from('risk_scenario_templates').delete().eq('id', id)
    if (e) { console.error('[template delete]', e.message); return }
    refetch()
  }, [refetch])

  const loadNodes = useCallback(async (id: string): Promise<TemplateNode[]> => {
    const { data, error: e } = await supabase.from('risk_scenario_template_nodes')
      .select('node_type,label,position').eq('template_id', id).order('position')
    if (e) { console.error('[template loadNodes]', e.message); return [] }
    return (data ?? []) as unknown as TemplateNode[]
  }, [])

  return { templates, loading, error, save, remove, loadNodes, refetch }
}
