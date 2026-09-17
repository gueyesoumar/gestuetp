import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ALL_DESELECTABLE_KEYS } from './workflowStepCatalog'

export interface TemplateInput { name: string; disabled_steps: string[]; is_default: boolean }

interface Result {
  create: (input: TemplateInput) => Promise<boolean>
  update: (id: string, input: TemplateInput) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
  saving: boolean
  deleting: boolean
  error: string | null
}

// Double filet : n'écrire que des clés de la liste blanche (le CHECK 00252 refuse le reste).
const clean = (steps: string[]): string[] => steps.filter((k) => ALL_DESELECTABLE_KEYS.includes(k))
const mapErr = (e: { code?: string } | null, fallback: string): string =>
  e?.code === '23505' ? 'Un template porte déjà ce nom.' : fallback

/** CRUD des templates de parcours en RLS directe (own-org + can_manage_workflow). RFC 0009 phase 2. */
export function useWorkflowTemplateCrud(onSuccess?: () => void): Result {
  const { profile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (input: TemplateInput): Promise<boolean> => {
    if (!profile?.organization_id) return false
    setSaving(true); setError(null)
    const { error: e } = await supabase.from('organization_workflow_templates').insert({
      organization_id: profile.organization_id, name: input.name.trim(),
      disabled_steps: clean(input.disabled_steps), is_default: input.is_default, updated_by: profile.id,
    })
    setSaving(false)
    if (e) { console.error('createTemplate:', e.message); setError(mapErr(e, 'Création impossible.')); return false }
    onSuccess?.(); return true
  }, [profile?.organization_id, profile?.id, onSuccess])

  const update = useCallback(async (id: string, input: TemplateInput): Promise<boolean> => {
    if (!profile?.organization_id) return false
    setSaving(true); setError(null)
    const { error: e } = await supabase.from('organization_workflow_templates').update({
      name: input.name.trim(), disabled_steps: clean(input.disabled_steps),
      is_default: input.is_default, updated_by: profile.id,
    }).eq('id', id)
    setSaving(false)
    if (e) { console.error('updateTemplate:', e.message); setError(mapErr(e, 'Modification impossible.')); return false }
    onSuccess?.(); return true
  }, [profile?.organization_id, profile?.id, onSuccess])

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setDeleting(true); setError(null)
    const { error: e } = await supabase.from('organization_workflow_templates').delete().eq('id', id)
    setDeleting(false)
    if (e) { console.error('deleteTemplate:', e.message); setError('Suppression impossible.'); return false }
    onSuccess?.(); return true
  }, [onSuccess])

  return { create, update, remove, saving, deleting, error }
}
