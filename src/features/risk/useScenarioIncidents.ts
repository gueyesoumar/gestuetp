import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  INCIDENT_WINDOW_MONTHS, INCIDENT_CATEGORY_DIMENSION, incidentSeverityBump,
  type ScoreDimensionKey,
} from '../../lib/constants'
import type { IncidentCategory, IncidentSeverity } from '../../types/database.types'

export interface ScenarioIncident {
  id: string
  title: string
  severity: IncidentSeverity
  category: IncidentCategory
  /** Lié explicitement à ce scénario (sinon aggravation auto par dimension). */
  explicit: boolean
  linkId: string | null
}
export interface IncidentOption { id: string; title: string; severity: IncidentSeverity; category: IncidentCategory }

interface IncRow { id: string; title: string; severity: IncidentSeverity; category: IncidentCategory }
interface LinkRow { id: string; incident_id: string; risk_scenario_id: string }

/** Incidents aggravant un scénario (explicites + auto par dimension) + liaison explicite. */
export function useScenarioIncidents(scenarioId: string, dimension: ScoreDimensionKey | null): {
  incidents: ScenarioIncident[]
  bump: number
  loading: boolean
  search: (q: string) => Promise<IncidentOption[]>
  link: (incidentId: string) => Promise<void>
  unlink: (linkId: string) => Promise<void>
} {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const [incidents, setIncidents] = useState<ScenarioIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [key, setKey] = useState(0)

  useEffect(() => {
    if (!orgId) { setIncidents([]); setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - INCIDENT_WINDOW_MONTHS)
    void (async () => {
      const [{ data: incData }, { data: linkData }] = await Promise.all([
        supabase.from('incidents').select('id, title, severity, category')
          .eq('entity_id', orgId).gte('declared_at', cutoff.toISOString()).abortSignal(ac.signal),
        supabase.from('incident_risk_links').select('id, incident_id, risk_scenario_id')
          .eq('organization_id', orgId).abortSignal(ac.signal),
      ])
      if (ac.signal.aborted) return
      const recent = (incData ?? []) as IncRow[]
      const links = (linkData ?? []) as LinkRow[]
      const linkedAnywhere = new Set(links.map((l) => l.incident_id))
      const thisLinks = new Map(links.filter((l) => l.risk_scenario_id === scenarioId).map((l) => [l.incident_id, l.id]))
      const applicable = recent.flatMap((inc) => {
        const explicit = thisLinks.has(inc.id)
        const auto = !linkedAnywhere.has(inc.id) && INCIDENT_CATEGORY_DIMENSION[inc.category] === dimension
        if (!explicit && !auto) return []
        return [{ id: inc.id, title: inc.title, severity: inc.severity, category: inc.category, explicit, linkId: thisLinks.get(inc.id) ?? null }]
      })
      setIncidents(applicable)
      setLoading(false)
    })()
    return () => ac.abort()
  }, [orgId, scenarioId, dimension, key])

  const bump = incidents.reduce((m, i) => Math.max(m, incidentSeverityBump(i.severity)), 0)

  const search = useCallback(async (q: string): Promise<IncidentOption[]> => {
    if (!orgId || q.trim().length < 2) return []
    const { data } = await supabase.from('incidents').select('id, title, severity, category')
      .eq('entity_id', orgId).ilike('title', `%${q}%`).limit(15)
    return (data ?? []) as IncidentOption[]
  }, [orgId])

  const link = useCallback(async (incidentId: string): Promise<void> => {
    if (!orgId) return
    const { error } = await supabase.from('incident_risk_links').insert({
      organization_id: orgId, incident_id: incidentId, risk_scenario_id: scenarioId,
    } as never)
    if (error) { console.error('[link incident]', error.message); return }
    setKey((k) => k + 1)
  }, [orgId, scenarioId])

  const unlink = useCallback(async (linkId: string): Promise<void> => {
    const { error } = await supabase.from('incident_risk_links').delete().eq('id', linkId)
    if (error) { console.error('[unlink incident]', error.message); return }
    setKey((k) => k + 1)
  }, [])

  return { incidents, bump, loading, search, link, unlink }
}
