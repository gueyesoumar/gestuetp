/**
 * ResetForm — demande de réinitialisation de mot de passe (login « oublié »).
 * Message NEUTRE quel que soit le résultat (anti-énumération de comptes).
 */

import type { FormEvent } from 'react'
import { Mail, ArrowLeft } from 'lucide-react'

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
          className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-white/50 transition-colors hover:text-[#E2C26B]"
        >
          <ArrowLeft size={15} /> Retour à la connexion
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
      <p className="text-[13.5px] leading-relaxed text-white/55">
        Saisissez votre adresse email : nous vous enverrons un lien pour réinitialiser votre mot de passe.
      </p>
      <div>
        <label htmlFor="reset-email" className="mb-1.5 block text-[12px] font-medium text-white/[0.72]">
          Adresse email
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
            <Mail size={16} />
          </span>
          <input
            id="reset-email"
            type="email"
            required
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            disabled={submitting}
            placeholder="vous@exemple.com"
            className="w-full rounded-xl border border-white/[0.15] bg-white/5 py-3 pl-11 pr-4 text-[14px] text-white placeholder-white/30 outline-none transition-all focus:border-[#D4A843]/50 focus:shadow-[0_0_0_3px_rgba(212,168,67,0.15)] disabled:opacity-50"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl py-3 text-[14px] font-bold text-[#1B4332] transition-all disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #D4A843 0%, #E2C26B 100%)' }}
      >
        {submitting ? 'Envoi…' : 'Envoyer le lien'}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 transition-colors hover:text-[#E2C26B]"
      >
        <ArrowLeft size={15} /> Retour à la connexion
      </button>
    </form>
  )
}
