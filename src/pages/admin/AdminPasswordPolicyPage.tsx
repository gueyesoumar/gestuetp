import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { PlatformPasswordPolicy, PlatformPasswordPolicyUpdate } from '../../types/database.types'
import { PasswordPolicyForm } from '../../features/admin/PasswordPolicyForm'

export function AdminPasswordPolicyPage(): JSX.Element {
  const { profile } = useAuth()
  const [policy, setPolicy] = useState<PlatformPasswordPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      const { data, error } = await supabase
        .from('platform_password_policy').select('*').eq('id', 1)
        .abortSignal(controller.signal).single()
      if (controller.signal.aborted) return
      if (error) { console.error('AdminPasswordPolicy:', error.message); setLoading(false); return }
      setPolicy(data as PlatformPasswordPolicy)
      setLoading(false)
    })()
    return () => controller.abort()
  }, [])

  const save = useCallback(async (fields: PlatformPasswordPolicyUpdate) => {
    setSaving(true); setStatus(null)
    const { error } = await supabase
      .from('platform_password_policy')
      .update({ ...fields, updated_at: new Date().toISOString(), updated_by: profile?.id ?? null })
      .eq('id', 1)
    setSaving(false)
    if (error) {
      console.error('AdminPasswordPolicy save:', error.message)
      setStatus({ ok: false, msg: 'Enregistrement impossible (droits insuffisants ?)' })
      return
    }
    setPolicy((p) => (p ? { ...p, ...fields } : p))
    setStatus({ ok: true, msg: 'Politique enregistrée.' })
  }, [profile?.id])

  if (loading) return <div className="p-6 text-[13px] text-gray-400">Chargement…</div>
  if (!policy) return <div className="p-6 text-[13px] text-red-500">Politique introuvable.</div>

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-[18px] font-semibold text-gray-900">Politique de mot de passe</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-500">
        S&apos;applique à tous les nouveaux mots de passe de la plateforme (définition et changement),
        enforced côté serveur. Le socle dur (longueur minimale et détection de fuites) reste également
        réglé au niveau de l&apos;authentification. Ces règles ne réinitialisent pas les mots de passe existants.
      </p>
      <PasswordPolicyForm policy={policy} saving={saving} status={status} onSave={save} />
    </div>
  )
}
