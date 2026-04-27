import { useEffect, useState } from 'react'
import { Lock, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import { useIsOrgAssociate } from './useIsOrgAssociate'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

/**
 * Onglet Paramètres : permet aux Associés de personnaliser les libellés
 * des étapes de revue (Chef de mission / Associé) selon les conventions
 * de leur cabinet.
 */

const DEFAULT_LEAD = 'Chef de mission'
const DEFAULT_ASSOCIATE = 'Associé'
const MAX_LEN = 40

export function WorkflowSettingsTab(): JSX.Element {
  const { profile } = useAuth()
  const { isAssociate, loading: permLoading } = useIsOrgAssociate()
  const toast = useToast()

  const [leadLabel, setLeadLabel] = useState('')
  const [associateLabel, setAssociateLabel] = useState('')
  const [initialLead, setInitialLead] = useState('')
  const [initialAssociate, setInitialAssociate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!profile?.organization_id) return
    const abort = new AbortController()
    void (async () => {
      const { data } = await supabase
        .from('organizations')
        .select('review_lead_label, review_associate_label')
        .eq('id', profile.organization_id)
        .abortSignal(abort.signal)
        .maybeSingle()
      if (abort.signal.aborted) return
      const o = data as { review_lead_label: string | null; review_associate_label: string | null } | null
      const lead = o?.review_lead_label ?? ''
      const assoc = o?.review_associate_label ?? ''
      setLeadLabel(lead)
      setAssociateLabel(assoc)
      setInitialLead(lead)
      setInitialAssociate(assoc)
      setLoading(false)
    })()
    return () => abort.abort()
  }, [profile?.organization_id])

  const dirty = leadLabel.trim() !== initialLead && (leadLabel.trim().length > 0 || initialLead.length > 0)
    || associateLabel.trim() !== initialAssociate && (associateLabel.trim().length > 0 || initialAssociate.length > 0)
  const validLead = leadLabel.trim().length === 0 || leadLabel.trim().length <= MAX_LEN
  const validAssociate = associateLabel.trim().length === 0 || associateLabel.trim().length <= MAX_LEN

  const submit = async () => {
    if (!isAssociate || !dirty || !validLead || !validAssociate) return
    setSubmitting(true)
    const { data, error } = await supabase.functions.invoke('update-cabinet-settings', {
      body: {
        review_lead_label: leadLabel.trim() || null,
        review_associate_label: associateLabel.trim() || null,
        reason: reason.trim() || undefined,
      },
    })
    setSubmitting(false)
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? 'Mise à jour impossible')
      return
    }
    toast.success('Libellés mis à jour')
    setInitialLead(leadLabel.trim())
    setInitialAssociate(associateLabel.trim())
    setReason('')
  }

  if (loading || permLoading) return <LoadingSpinner />

  return (
    <div className="max-w-3xl">
      <p className="mb-5 text-sm text-gray-600">
        Personnalisez les libell&eacute;s des deux niveaux de revue selon les conventions de votre cabinet
        (ex : <i>Manager</i> / <i>Partner</i> au lieu de <i>Chef de mission</i> / <i>Associé</i>).
        Les libell&eacute;s s&apos;appliquent partout dans l&apos;app et dans les emails de notification.
      </p>

      {!isAssociate && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-2.5">
          <Lock size={14} className="mt-0.5 flex-shrink-0 text-amber-700" />
          <span className="text-[12.5px] text-amber-900">
            Seul un <b>Associ&eacute;</b> du cabinet peut modifier ces libell&eacute;s. Vous voyez la configuration en lecture seule.
          </span>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <header className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Sparkles size={14} className="text-gold-600" />
          <span className="text-[13px] font-bold text-gray-900">Libellés des étapes de revue</span>
        </header>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <LabelField
            label="Niveau 1 — revue principale"
            value={leadLabel}
            onChange={setLeadLabel}
            placeholder={DEFAULT_LEAD}
            disabled={!isAssociate || submitting}
            invalid={!validLead}
          />
          <LabelField
            label="Niveau 2 — validation finale"
            value={associateLabel}
            onChange={setAssociateLabel}
            placeholder={DEFAULT_ASSOCIATE}
            disabled={!isAssociate || submitting}
            invalid={!validAssociate}
          />
        </div>

        {isAssociate && (
          <div className="px-5 pb-5">
            <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Motif <span className="text-gray-400 font-normal">(optionnel)</span></label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Pourquoi ce changement ?"
              className="w-full text-[12.5px]"
              disabled={submitting}
            />
          </div>
        )}

        {isAssociate && (
          <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setLeadLabel(initialLead); setAssociateLabel(initialAssociate); setReason('') }}
              disabled={!dirty || submitting}
              className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >Annuler les changements</button>
            <button
              type="button"
              onClick={submit}
              disabled={!dirty || !validLead || !validAssociate || submitting}
              className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg bg-forest-700 text-white hover:bg-forest-900 disabled:opacity-50"
            >{submitting ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        )}
      </div>
    </div>
  )
}

function LabelField({ label, value, onChange, placeholder, disabled, invalid }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; disabled: boolean; invalid: boolean }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={MAX_LEN + 5}
        disabled={disabled}
        className={`w-full text-[13px] ${invalid ? 'border-red-400' : ''}`}
      />
      <div className="mt-1 flex justify-between text-[10.5px] text-gray-400">
        <span>Vide = utilise le défaut Gëstu (&laquo; {placeholder} &raquo;)</span>
        <span className={value.length > MAX_LEN ? 'text-red-500' : ''}>{value.length}/{MAX_LEN}</span>
      </div>
    </div>
  )
}
