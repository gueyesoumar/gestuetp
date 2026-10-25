import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { ReportTemplate, ReportTemplateInsert } from '../../types/database.types'

interface Result { ok: boolean; error?: string }

/** CRUD des templates de rapport du cabinet (RLS : lecture org, ecriture gardee par
 *  can_manage_report_templates). RFC 0021 Lot 3b. */
export function useReportTemplates(): {
  templates: ReportTemplate[]
  loading: boolean
  refresh: () => void
  save: (tpl: ReportTemplateInsert & { id?: string }) => Promise<Result>
  remove: (id: string) => Promise<Result>
} {
  const { profile } = useAuth()
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [key, setKey] = useState(0)
  const refresh = useCallback(() => setKey((k) => k + 1), [])

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    supabase
      .from('report_templates')
      .select('*')
      .order('scope', { ascending: true })
      .order('name', { ascending: true })
      .abortSignal(ac.signal)
      .then(({ data, error }) => {
        if (ac.signal.aborted) return
        if (error) console.error('[useReportTemplates]', error.message)
        setTemplates((data ?? []) as ReportTemplate[])
        setLoading(false)
      })
    return () => ac.abort()
  }, [key])

  const save = useCallback(async (tpl: ReportTemplateInsert & { id?: string }): Promise<Result> => {
    if (!profile?.organization_id) return { ok: false, error: 'Organisation inconnue' }
    const { id, ...rest } = tpl
    const payload = { ...rest, organization_id: profile.organization_id }
    const { error } = id
      ? await supabase.from('report_templates').update(payload as never).eq('id', id)
      : await supabase.from('report_templates').insert(payload as never)
    if (error) console.error('[useReportTemplates] save:', error.message)
    return { ok: !error, error: error?.message }
  }, [profile?.organization_id])

  const remove = useCallback(async (id: string): Promise<Result> => {
    const { error } = await supabase.from('report_templates').delete().eq('id', id)
    if (error) console.error('[useReportTemplates] remove:', error.message)
    return { ok: !error, error: error?.message }
  }, [])

  return { templates, loading, refresh, save, remove }
}
