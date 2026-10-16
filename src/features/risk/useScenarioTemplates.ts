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
  platform: ScenarioTemplateRow[]
  loading: boolean
  error: string | null
  save: (input: TemplateInput, id?: string) => Promise<{ ok: boolean; error?: string }>
  remove: (id: string) => Promise<void>
  loadNodes: (id: string) => Promise<TemplateNode[]>
  duplicate: (t: ScenarioTemplateRow) => Promise<{ ok: boolean; error?: string }>
  refetch: () => void
}

/** CRUD des modèles de scénarios propres à mon org (catalogue régulateur). */
export function useScenarioTemplates(): Result {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [templates, setTemplates] = useState<ScenarioTemplateRow[]>([])
  const [platform, setPlatform] = useState<ScenarioTemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)
  const refetch = useCallback(() => setKey((k) => k + 1), [])

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    const ac = new AbortController()
    setLoading(true); setError(null)
    const cols = 'id,sectors,title,dimension,suggested_likelihood,suggested_impact,vulnerability,is_active'
    void (async () => {
      const [own, plat] = await Promise.all([
        supabase.from('risk_scenario_templates').select(cols).eq('owner_org_id', orgId).order('title').abortSignal(ac.signal),
        supabase.from('risk_scenario_templates').select(cols).is('owner_org_id', null).order('title').abortSignal(ac.signal),
      ])
      if (ac.signal.aborted) return
      if (own.error) { console.error('[useScenarioTemplates]', own.error.message); setError('Chargement des modèles impossible.'); setLoading(false); return }
      setTemplates((own.data ?? []) as unknown as ScenarioTemplateRow[])
      setPlatform((plat.data ?? []) as unknown as ScenarioTemplateRow[])
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

  const duplicate = useCallback(async (t: ScenarioTemplateRow) => {
    const nodes = await loadNodes(t.id)
    return save({
      title: `${t.title} (copie)`, sectors: t.sectors, dimension: t.dimension,
      suggested_likelihood: t.suggested_likelihood, suggested_impact: t.suggested_impact,
      vulnerability: t.vulnerability, is_active: t.is_active, nodes,
    })
  }, [loadNodes, save])

  return { templates, platform, loading, error, save, remove, loadNodes, duplicate, refetch }
}
