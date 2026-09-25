import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { PlatformPasswordPolicy, PlatformPasswordPolicyUpdate } from '../../types/database.types'
import { PasswordPolicyForm } from '../../features/admin/PasswordPolicyForm'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { KpiTile } from '../../features/admin/dashboard/KpiTile'
import { useToast } from '../../hooks/useToast'

export function AdminPasswordPolicyPage(): JSX.Element {
  const { profile } = useAuth()
  const [policy, setPolicy] = useState<PlatformPasswordPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      const { data, error: qErr } = await supabase
        .from('platform_password_policy').select('*').eq('id', 1)
        .abortSignal(controller.signal).single()
      if (controller.signal.aborted) return
      if (qErr) { console.error('AdminPasswordPolicy:', qErr.message); setError('Chargement impossible'); setLoading(false); return }
      setPolicy(data as PlatformPasswordPolicy)
      setLoading(false)
    })()
    return () => controller.abort()
  }, [])

  const save = useCallback(async (fields: PlatformPasswordPolicyUpdate) => {
    setSaving(true)
    const now = new Date().toISOString()
    const { error: sErr } = await supabase
      .from('platform_password_policy')
      .update({ ...fields, updated_at: now, updated_by: profile?.id ?? null })
      .eq('id', 1)
    setSaving(false)
    if (sErr) {
      console.error('AdminPasswordPolicy save:', sErr.message)
      toast.error('Enregistrement impossible (droits insuffisants ?)', sErr)
      return
    }
    setPolicy((p) => (p ? { ...p, ...fields, updated_at: now } : p))
    toast.success('Politique enregistrée')
  }, [profile?.id, toast])

  if (loading) return <div className="p-8"><LoadingSpinner /></div>
  if (error) return <div className="p-8"><ErrorAlert message={error} /></div>
  if (!policy) return <div className="p-8"><ErrorAlert message="Politique introuvable." /></div>

  const activeRules = [
    policy.require_upper, policy.require_lower, policy.require_digit,
    policy.require_symbol, policy.forbid_common, policy.check_hibp,
  ].filter(Boolean).length

  return (
    <div className="px-7 py-6">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[11.5px] text-gray-500"><b className="text-forest-900 font-semibold">Admin</b> &rsaquo; Sécurité</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900">Sécurité</h1>
      <p className="text-[12.5px] text-gray-500 mt-1 mb-5 max-w-2xl">
        Définissez ici les règles de mot de passe imposées à tous les utilisateurs de la plateforme. Elles sont appliquées côté serveur à chaque définition ou changement de mot de passe, sans réinitialiser les mots de passe existants.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <KpiTile label="Longueur minimale" value={String(policy.min_length)} sub="caractères" accent="green" />
        <KpiTile label="Règles actives" value={`${activeRules} / 6`} accent="gold" />
        <KpiTile label="Fuites connues (HIBP)" value={policy.check_hibp ? 'Oui' : 'Non'} accent="blue" />
        <KpiTile label="Dernière modif." value={formatDate(policy.updated_at)} accent="purple" />
      </div>

      <PasswordPolicyForm policy={policy} saving={saving} onSave={save} />
    </div>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
