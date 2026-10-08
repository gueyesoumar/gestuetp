import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { readInvokeError } from '../../../lib/edgeError'

export interface MappingQuestion {
  id: string
  code: string
  text: string
  description: string | null
  question_type: string
  is_required: boolean
}
export interface MappingControl {
  id: string
  code: string
  name: string
  risk_level: number | null
  domain_id: string
}
export interface MappingLink { question_id: string; control_id: string; weight: number }
export interface AiSuggestion { question_id: string; control_id: string; weight: number }

export interface CoverageRow { control: MappingControl; questionCount: number; bestWeight: number }
export interface MappingCoverage {
  totalControls: number
  controlsCovered: number
  totalQuestions: number
  questionsMapped: number
  orphanQuestions: number
  uncoveredControls: number
  criticalUncovered: number
  rows: CoverageRow[]
}

const CRITICAL_RISK = 4

/** Charge le mapping question↔contrôle d'un référentiel (lecture directe), expose les
 *  écritures via l'edge platform-owner et calcule la couverture. */
export function useQuestionMapping(frameworkId: string | undefined) {
  const [questions, setQuestions] = useState<MappingQuestion[]>([])
  const [controls, setControls] = useState<MappingControl[]>([])
  const [links, setLinks] = useState<MappingLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!frameworkId) { setLoading(false); return }
    setLoading(true); setError(null)

    const { data: tpl, error: tErr } = await supabase.from('questionnaire_templates')
      .select('id').eq('framework_id', frameworkId).eq('is_active', true).limit(1).maybeSingle()
    if (signal?.aborted) return
    if (tErr) { console.error('[mapping] template:', tErr.message); setError('Chargement du questionnaire impossible'); setLoading(false); return }

    const { data: domains } = await supabase.from('domains').select('id').eq('framework_id', frameworkId)
    if (signal?.aborted) return
    const domainIds = (domains ?? []).map((d) => d.id as string)

    const [qRes, cRes] = await Promise.all([
      tpl
        ? supabase.from('questions').select('id, code, text, description, question_type, is_required').eq('template_id', tpl.id as string).order('sort_order')
        : Promise.resolve({ data: [], error: null }),
      domainIds.length > 0
        ? supabase.from('controls').select('id, code, name, risk_level, domain_id').in('domain_id', domainIds).order('code')
        : Promise.resolve({ data: [], error: null }),
    ])
    if (signal?.aborted) return

    const qs = (qRes.data ?? []) as MappingQuestion[]
    const cs = (cRes.data ?? []) as MappingControl[]
    setQuestions(qs)
    setControls(cs)

    if (qs.length > 0) {
      const { data: linkRows } = await supabase.from('question_controls')
        .select('question_id, control_id, weight').in('question_id', qs.map((q) => q.id))
      if (signal?.aborted) return
      setLinks((linkRows ?? []) as MappingLink[])
    } else {
      setLinks([])
    }
    setLoading(false)
  }, [frameworkId])

  useEffect(() => {
    const ac = new AbortController()
    void load(ac.signal)
    return () => ac.abort()
  }, [load])

  const setLink = useCallback(async (questionId: string, controlId: string, weight: number): Promise<boolean> => {
    const { data, error: e } = await supabase.functions.invoke('admin-question-controls', {
      body: { action: 'set', question_id: questionId, control_id: controlId, weight },
    })
    if (e || data?.error) { console.error('[mapping] set:', await readInvokeError(e, data, 'Écriture impossible')); return false }
    setLinks((prev) => {
      const rest = prev.filter((l) => !(l.question_id === questionId && l.control_id === controlId))
      return [...rest, { question_id: questionId, control_id: controlId, weight }]
    })
    return true
  }, [])

  const removeLink = useCallback(async (questionId: string, controlId: string): Promise<boolean> => {
    const { data, error: e } = await supabase.functions.invoke('admin-question-controls', {
      body: { action: 'remove', question_id: questionId, control_id: controlId },
    })
    if (e || data?.error) { console.error('[mapping] remove:', await readInvokeError(e, data, 'Suppression impossible')); return false }
    setLinks((prev) => prev.filter((l) => !(l.question_id === questionId && l.control_id === controlId)))
    return true
  }, [])

  const generateSuggestions = useCallback(async (): Promise<{ suggestions: AiSuggestion[]; error?: string }> => {
    const { data, error: e } = await supabase.functions.invoke('admin-mapping-ai', { body: { framework_id: frameworkId } })
    if (e || data?.error) return { suggestions: [], error: await readInvokeError(e, data, 'Génération IA impossible') }
    return { suggestions: (data?.suggestions ?? []) as AiSuggestion[] }
  }, [frameworkId])

  const coverage = useMemo<MappingCoverage>(() => {
    const byControl = new Map<string, number>() // control_id → best weight
    const byQuestion = new Set<string>()
    for (const l of links) {
      byControl.set(l.control_id, Math.max(byControl.get(l.control_id) ?? 0, l.weight))
      byQuestion.add(l.question_id)
    }
    const rows: CoverageRow[] = controls.map((c) => ({
      control: c,
      questionCount: links.filter((l) => l.control_id === c.id).length,
      bestWeight: byControl.get(c.id) ?? 0,
    }))
    const criticalUncovered = controls.filter((c) => (c.risk_level ?? 0) >= CRITICAL_RISK && (byControl.get(c.id) ?? 0) < 3).length
    return {
      totalControls: controls.length,
      controlsCovered: byControl.size,
      totalQuestions: questions.length,
      questionsMapped: byQuestion.size,
      orphanQuestions: questions.length - byQuestion.size,
      uncoveredControls: controls.length - byControl.size,
      criticalUncovered,
      rows,
    }
  }, [controls, questions, links])

  return { questions, controls, links, coverage, loading, error, setLink, removeLink, generateSuggestions, reload: load }
}
