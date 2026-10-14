import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Question } from '../../../types/database.types'

export interface QuestionnaireTemplateLite {
  id: string
  name: string
  kind: string
}

interface UseTemplateQuestionsResult {
  /** Tous les templates actifs du référentiel (les « formules » disponibles). */
  templates: QuestionnaireTemplateLite[]
  /** Template effectivement sélectionné (celui dont on lit les questions). */
  selectedTemplateId: string | null
  questions: Question[]
  templateName: string | null
  loading: boolean
  error: string | null
}

/**
 * Charge les templates (formules) d'un référentiel et les questions du template choisi.
 * `templateId` optionnel : sans lui, on prend le template `context` (ou le 1er actif) -
 * comportement iso-historique (RFC 0015, Lot 1).
 */
export function useTemplateQuestions(
  frameworkId: string | undefined,
  templateId?: string,
): UseTemplateQuestionsResult {
  const [templates, setTemplates] = useState<QuestionnaireTemplateLite[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [templateName, setTemplateName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!frameworkId) { setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    setError(null)

    void (async () => {
      const { data: tpls, error: tErr } = await supabase
        .from('questionnaire_templates')
        .select('id, name, kind')
        .eq('framework_id', frameworkId)
        .eq('is_active', true)
        .order('kind') // 'context' avant 'self_assessment'
        .order('name')
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (tErr) {
        console.error('[useTemplateQuestions] templates:', tErr.message)
        setError('Impossible de charger les modèles')
        setLoading(false)
        return
      }
      const list = (tpls ?? []) as QuestionnaireTemplateLite[]
      setTemplates(list)

      // Template effectif : celui demandé (s'il est dans la liste), sinon le context, sinon le 1er.
      const effective =
        list.find((t) => t.id === templateId) ??
        list.find((t) => t.kind === 'context') ??
        list[0] ?? null

      if (!effective) {
        setSelectedTemplateId(null); setTemplateName(null); setQuestions([]); setLoading(false); return
      }

      const { data: qs, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .eq('template_id', effective.id)
        .order('sort_order')
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (qErr) {
        console.error('[useTemplateQuestions] questions:', qErr.message)
        setError('Impossible de charger les questions')
        setLoading(false)
        return
      }
      // Mise à jour COHÉRENTE : id + nom + questions dans le même lot, pour éviter un
      // état intermédiaire (selectedTemplateId neuf avec les anciennes questions) qui
      // faisait ré-hydrater la sélection avec le mauvais template (compteur inversé).
      setSelectedTemplateId(effective.id)
      setTemplateName(effective.name)
      setQuestions((qs ?? []) as unknown as Question[])
      setLoading(false)
    })()

    return () => ac.abort()
  }, [frameworkId, templateId])

  return { templates, selectedTemplateId, questions, templateName, loading, error }
}
