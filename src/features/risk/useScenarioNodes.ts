import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { RiskScenarioNode, RiskNodeType } from '../../types/database.types'

/**
 * Causes & conséquences d'un scénario (RFC 0017 G2, zones 1 et 5 du nœud papillon).
 * N causes + N conséquences par scénario ; org-scoped (RLS).
 */
export function useScenarioNodes(scenarioId: string | null) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [nodes, setNodes] = useState<RiskScenarioNode[]>([])
  const [loading, setLoading] = useState(true)
  const [key, setKey] = useState(0)
  const refresh = useCallback(() => setKey((k) => k + 1), [])

  useEffect(() => {
    if (!scenarioId) { setNodes([]); setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data, error } = await supabase
        .from('risk_scenario_nodes')
        .select('*')
        .eq('risk_scenario_id', scenarioId)
        .order('node_type', { ascending: true })
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (error) { console.error('[useScenarioNodes]', error.message); setLoading(false); return }
      setNodes((data ?? []) as unknown as RiskScenarioNode[])
      setLoading(false)
    })()
    return () => ac.abort()
  }, [scenarioId, key])

  const addNode = useCallback(async (nodeType: RiskNodeType, label: string): Promise<boolean> => {
    const text = label.trim()
    if (!orgId || !scenarioId || !text) return false
    const { error } = await supabase.from('risk_scenario_nodes').insert({
      organization_id: orgId, risk_scenario_id: scenarioId, node_type: nodeType,
      label: text, created_by: profile?.id ?? null,
    } as never)
    if (error) { console.error('[addNode]', error.message); return false }
    refresh()
    return true
  }, [orgId, scenarioId, profile?.id, refresh])

  const removeNode = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.from('risk_scenario_nodes').delete().eq('id', id)
    if (error) { console.error('[removeNode]', error.message); return }
    refresh()
  }, [refresh])

  const causes = nodes.filter((n) => n.node_type === 'cause')
  const consequences = nodes.filter((n) => n.node_type === 'consequence')
  return { causes, consequences, loading, addNode, removeNode, refresh }
}
