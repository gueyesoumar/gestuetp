import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import type { CabinetBrandingRow } from './useCabinetBrandingAdmin'
import type { ExtractedColors } from '../../branding/extractColorsFromImage'

export interface BrandingDraft {
  primary: string
  accent: string
  supportEmail: string
  emailFromName: string
  footerText: string
}

interface Props {
  cabinetId: string
  branding: CabinetBrandingRow | null
  /** Couleurs déduites côté client après upload du logo light */
  suggestedColors?: ExtractedColors | null
  /** Callback live à chaque changement, pour la prévisualisation parent */
  onDraftChange?: (draft: BrandingDraft) => void
  onSaved: () => void
}

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/

export function BrandingFormSection({ cabinetId, branding, suggestedColors, onDraftChange, onSaved }: Props): JSX.Element {
  const [primary, setPrimary] = useState(branding?.primary_color ?? '')
  const [accent, setAccent] = useState(branding?.accent_color ?? '')
  const [supportEmail, setSupportEmail] = useState(branding?.support_email ?? '')
  const [emailFromName, setEmailFromName] = useState(branding?.email_from_name ?? '')
  const [footerText, setFooterText] = useState(branding?.footer_text ?? '')
  const [showReason, setShowReason] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [appliedSuggestion, setAppliedSuggestion] = useState(false)
  const toast = useToast()

  useEffect(() => {
    setPrimary(branding?.primary_color ?? '')
    setAccent(branding?.accent_color ?? '')
    setSupportEmail(branding?.support_email ?? '')
    setEmailFromName(branding?.email_from_name ?? '')
    setFooterText(branding?.footer_text ?? '')
    setAppliedSuggestion(false)
  }, [branding])

  // Auto-applique les couleurs déduites du logo si les deux champs sont vides
  useEffect(() => {
    if (!suggestedColors) return
    if (primary || accent) return
    setPrimary(suggestedColors.primary)
    setAccent(suggestedColors.accent)
    setAppliedSuggestion(true)
  }, [suggestedColors, primary, accent])

  // Live emission du draft pour la prévisualisation
  useEffect(() => {
    onDraftChange?.({ primary, accent, supportEmail, emailFromName, footerText })
  }, [primary, accent, supportEmail, emailFromName, footerText, onDraftChange])

  const applySuggestionExplicit = () => {
    if (!suggestedColors) return
    setPrimary(suggestedColors.primary)
    setAccent(suggestedColors.accent)
    setAppliedSuggestion(true)
  }

  const validate = (): string | null => {
    if (primary && !HEX_COLOR_RE.test(primary)) return 'Couleur primaire au format #RRGGBB'
    if (accent && !HEX_COLOR_RE.test(accent)) return 'Couleur accent au format #RRGGBB'
    if (emailFromName && emailFromName.trim().length > 80) return 'Nom expéditeur limité à 80 caractères'
    if (footerText && footerText.length > 280) return 'Footer limité à 280 caractères'
    return null
  }

  const submit = async () => {
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }
    if (!reason.trim()) return
    setSubmitting(true)
    const { data, error } = await supabase.functions.invoke('admin-cabinet-branding', {
      body: {
        action: 'upsert',
        cabinet_id: cabinetId,
        reason,
        primary_color: primary || null,
        accent_color: accent || null,
        support_email: supportEmail.trim() || null,
        email_from_name: emailFromName.trim() || null,
        footer_text: footerText.trim() || null,
      },
    })
    setSubmitting(false)
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? 'Mise à jour impossible')
      return
    }
    toast.success('Branding enregistré')
    setShowReason(false)
    setReason('')
    onSaved()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <header className="px-4 py-3 border-b border-gray-100">
        <span className="text-[13px] font-bold text-gray-900">Couleurs &amp; emails</span>
      </header>

      {suggestedColors && !appliedSuggestion && (primary || accent) && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-3 text-[12px] text-amber-900">
          <Sparkles size={14} className="flex-shrink-0" />
          <span>Couleurs déduites du logo disponibles :</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded border border-amber-300" style={{ background: suggestedColors.primary }} />
            <code className="font-mono text-[11.5px]">{suggestedColors.primary}</code>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded border border-amber-300" style={{ background: suggestedColors.accent }} />
            <code className="font-mono text-[11.5px]">{suggestedColors.accent}</code>
          </span>
          <button type="button" onClick={applySuggestionExplicit} className="ml-auto px-2 py-1 bg-forest-700 text-white rounded text-[11px] font-semibold hover:bg-forest-900">
            Remplacer par ces couleurs
          </button>
        </div>
      )}

      {appliedSuggestion && suggestedColors && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center gap-2 text-[11.5px] text-blue-900">
          <Sparkles size={13} className="flex-shrink-0" />
          <span>Couleurs déduites du logo &mdash; modifiables avant enregistrement.</span>
          <button type="button" onClick={() => setAppliedSuggestion(false)} className="ml-auto text-blue-700 hover:text-blue-900" title="Masquer cette mention">
            <X size={13} />
          </button>
        </div>
      )}

      <div className="px-4 py-4 grid grid-cols-2 gap-4">
        <ColorField label="Couleur primaire" value={primary} onChange={(v) => { setPrimary(v); setAppliedSuggestion(false) }} placeholder="#1B4332" />
        <ColorField label="Couleur accent" value={accent} onChange={(v) => { setAccent(v); setAppliedSuggestion(false) }} placeholder="#D4A843" />
        <FieldText label="Email de support" value={supportEmail} onChange={setSupportEmail} placeholder="support@auditco.sn" />
        <FieldText label="Nom expéditeur (emails)" value={emailFromName} onChange={setEmailFromName} placeholder="Audit&Co Sénégal via Gëstu" maxLength={80} />
        <div className="col-span-2">
          <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Texte de pied de page email</label>
          <textarea
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            rows={2}
            maxLength={280}
            placeholder="Mention légale, adresse postale, etc. (optionnel, max 280 caractères)"
            className="w-full text-[12.5px]"
          />
          <div className="text-[10.5px] text-gray-400 mt-1">{footerText.length}/280</div>
        </div>
      </div>
      <div className="px-4 py-3 bg-page-bg border-t border-gray-200 flex justify-end">
        <button
          type="button"
          onClick={() => setShowReason(true)}
          className="px-3.5 py-2 text-[12.5px] font-semibold bg-forest-700 text-white rounded-lg hover:bg-forest-900"
        >
          Enregistrer
        </button>
      </div>

      {showReason && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-[14.5px] font-bold text-gray-900">Enregistrer le branding</h3>
              <p className="text-[12px] text-gray-500 mt-1">Le motif est tracé dans l&apos;audit log.</p>
            </div>
            <div className="px-5 py-4">
              <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Motif <span className="text-red-500">*</span></label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Pourquoi cette modification ?" className="w-full" disabled={submitting} />
            </div>
            <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => { setShowReason(false); setReason('') }} disabled={submitting} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button onClick={submit} disabled={submitting || !reason.trim()} className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg bg-forest-700 text-white hover:bg-forest-900 disabled:opacity-50">
                {submitting ? 'En cours…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ColorField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const isValid = !value || HEX_COLOR_RE.test(value)
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-lg border border-gray-300" style={{ background: isValid && value ? value : '#F3F4F6' }} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 font-mono text-[12.5px] ${!isValid ? 'border-red-400' : ''}`}
        />
      </div>
    </div>
  )
}

function FieldText({ label, value, onChange, placeholder, maxLength }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; maxLength?: number }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} className="w-full text-[12.5px]" />
    </div>
  )
}
