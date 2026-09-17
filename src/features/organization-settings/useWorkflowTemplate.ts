import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'

// Catalogue des étapes désélectionnables (RFC 0009). DOIT rester synchro avec le
// CHECK liste blanche de la migration 00252 (source de vérité côté base).
export interface StepDef { key: string; label: string; hint?: string }
export interface StepGroup { title: string; steps: StepDef[] }

export const WORKFLOW_STEP_GROUPS: StepGroup[] = [
  {
    title: 'Cadrage — sous-étapes',
    steps: [
      { key: 'scoping.risks', label: 'Risques', hint: 'Déjà masqué en moteur Contrôle' },
      { key: 'scoping.questionnaire', label: 'Questionnaire' },
      { key: 'scoping.documents', label: 'Documents' },
      { key: 'scoping.actors', label: 'Acteurs' },
    ],
  },
  {
    title: 'Phases optionnelles',
    steps: [
      { key: 'client_review', label: 'Validation client', hint: 'La revue passe directement à la clôture' },
      { key: 'action_plan', label: "Plan d'action" },
    ],
  },
]

export const ALL_DESELECTABLE_KEYS: string[] = WORKFLOW_STEP_GROUPS.flatMap((g) => g.steps.map((s) => s.key))

interface Result {
  disabledSteps: string[]
  loading: boolean
  error: string | null
  saving: boolean
  save: (next: string[]) => Promise<void>
}

/**
 * Lit / écrit le template de parcours PAR DÉFAUT de l'org courante (RFC 0009 INC 3).
 * Écriture RLS directe (own-org + can_manage_workflow) — pas d'edge function.
 * Opère toujours sur LE template is_default (update par id, sinon insert) pour ne
 * jamais violer l'index « un seul is_default par org ».
 */
export function useWorkflowTemplate(): Result {
  const { profile } = useAuth()
  const toast = useToast()
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [disabledSteps, setDisabledSteps] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile?.organization_id) return
    const abort = new AbortController()
    void (async () => {
      const { data, error: qErr } = await supabase
        .from('organization_workflow_templates')
        .select('id, disabled_steps')
        .eq('is_default', true)
        .abortSignal(abort.signal)
        .maybeSingle()
      if (abort.signal.aborted) return
      if (qErr) { console.error('useWorkflowTemplate:', qErr.message); setError('Chargement impossible'); setLoading(false); return }
      const row = data as { id: string; disabled_steps: string[] } | null
      setTemplateId(row?.id ?? null)
      setDisabledSteps(row?.disabled_steps ?? [])
      setLoading(false)
    })()
    return () => abort.abort()
  }, [profile?.organization_id])

  const save = useCallback(async (next: string[]) => {
    if (!profile?.organization_id) return
    // Double filet : n'envoyer que des clés de la liste blanche (le CHECK 00252 refuse le reste).
    const clean = next.filter((k) => ALL_DESELECTABLE_KEYS.includes(k))
    setSaving(true)
    let saveError: { message: string } | null = null
    if (templateId) {
      const { error: uErr } = await supabase
        .from('organization_workflow_templates')
        .update({ disabled_steps: clean, updated_by: profile.id })
        .eq('id', templateId)
      saveError = uErr
    } else {
      const { data, error: iErr } = await supabase
        .from('organization_workflow_templates')
        .insert({ organization_id: profile.organization_id, name: 'Parcours par défaut', disabled_steps: clean, is_default: true, updated_by: profile.id })
        .select('id')
        .maybeSingle()
      saveError = iErr
      if (!iErr && data) setTemplateId((data as { id: string }).id)
    }
    setSaving(false)
    if (saveError) { console.error('useWorkflowTemplate save:', saveError.message); toast.error('Enregistrement impossible (droits insuffisants ?)'); return }
    setDisabledSteps(clean)
    toast.success('Parcours enregistré', { description: 'Appliqué aux nouvelles missions du cabinet.' })
  }, [profile?.organization_id, profile?.id, templateId, toast])

  return { disabledSteps, loading, error, saving, save }
}
