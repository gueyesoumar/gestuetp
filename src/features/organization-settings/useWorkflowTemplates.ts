import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { OrganizationWorkflowTemplate } from '../../types/database.types'

interface Result {
  templates: OrganizationWorkflowTemplate[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/** Liste les templates de parcours de l'org courante (RLS own-org). RFC 0009 phase 2. */
export function useWorkflowTemplates(): Result {
  const { profile } = useAuth()
  const [templates, setTemplates] = useState<OrganizationWorkflowTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!profile?.organization_id) return
    const abort = new AbortController()
    setLoading(true)
    setError(null)
    void (async () => {
      const { data, error: qErr } = await supabase
        .from('organization_workflow_templates')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('name')
        .abortSignal(abort.signal)
      if (abort.signal.aborted) return
      if (qErr) { console.error('useWorkflowTemplates:', qErr.message); setError('Chargement impossible'); setLoading(false); return }
      setTemplates((data ?? []) as OrganizationWorkflowTemplate[])
      setLoading(false)
    })()
    return () => abort.abort()
  }, [profile?.organization_id, refreshKey])

  return { templates, loading, error, refetch }
}
