/**
 * ResetForm - demande de réinitialisation de mot de passe (login « oublié »).
 * Message NEUTRE quel que soit le résultat (anti-énumération de comptes).
 */

import type { FormEvent } from 'react'
import { Mail, ArrowLeft } from 'lucide-react'
import { FIELD_WRAP, FIELD_LEAD, FIELD_INPUT, FIELD_LABEL, CTA_CLASS, CTA_GRADIENT } from './authFieldStyles'

interface ResetFormProps {
  email: string
  submitting: boolean
  sent: boolean
  onEmailChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  onBack: () => void
}

export function ResetForm({ email, submitting, sent, onEmailChange, onSubmit, onBack }: ResetFormProps): JSX.Element {
  if (sent) {
    return (
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-[#D4A843]/20 bg-[#D4A843]/10 px-4 py-4 text-[13px] leading-relaxed text-white/80">
          Si un compte est associé à cette adresse, un lien de réinitialisation vient d&rsquo;être envoyé.
          Pensez à vérifier vos courriers indésirables.
        </div>
        <button
          type="button"
          onClick={onBack}
          className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-white/60 transition-colors hover:text-[#E2C26B]"
        >
          <ArrowLeft size={15} /> Retour à la connexion
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
      <p className="text-[13.5px] leading-relaxed text-white/70">
        Saisissez votre adresse email : nous vous enverrons un lien pour réinitialiser votre mot de passe.
      </p>
      <div>
        <label htmlFor="reset-email" className={FIELD_LABEL}>Adresse email</label>
        <div className={FIELD_WRAP}>
          <span className={FIELD_LEAD}><Mail size={17} /></span>
          <input
            id="reset-email"
            type="email"
            required
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            disabled={submitting}
            placeholder="vous@exemple.gouv.sn"
            autoComplete="username"
            className={FIELD_INPUT}
          />
        </div>
      </div>
      <button type="submit" disabled={submitting} className={CTA_CLASS} style={{ background: CTA_GRADIENT }}>
        {submitting ? 'Envoi en cours' : 'Envoyer le lien'}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-white/60 transition-colors hover:text-[#E2C26B]"
      >
        <ArrowLeft size={15} /> Retour à la connexion
      </button>
    </form>
  )
}
