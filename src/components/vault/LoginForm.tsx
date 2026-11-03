/**
 * LoginForm - formulaire de connexion du panneau sombre « Split souverain ».
 * Passe a11y/contraste : champs délimités, focus or visible, détection Verr. Maj.,
 * erreur avec role=alert, statut système explicite (spinner) sur le CTA.
 */

import { useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowBigUp, Loader2 } from 'lucide-react'
import { FIELD_WRAP, FIELD_LEAD, FIELD_INPUT, FIELD_LABEL, CTA_CLASS, CTA_GRADIENT } from './authFieldStyles'

interface LoginFormProps {
  email: string
  password: string
  error: string | null
  submitting: boolean
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  onForgot: () => void
}

export function LoginForm({
  email,
  password,
  error,
  submitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onForgot,
}: LoginFormProps): JSX.Element {
  const [showPassword, setShowPassword] = useState(false)
  const [capsOn, setCapsOn] = useState(false)

  const trackCaps = (e: KeyboardEvent<HTMLInputElement>): void => {
    setCapsOn(e.getModifierState('CapsLock'))
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[10px] border border-[#F3A29B]/45 bg-[#B3261E]/[0.16] px-3.5 py-3 text-[13px] font-medium text-[#F4B4AD]"
        >
          <AlertCircle size={17} className="mt-px shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="login-email" className={FIELD_LABEL}>Adresse email</label>
        <div className={FIELD_WRAP}>
          <span className={FIELD_LEAD}><Mail size={17} /></span>
          <input
            id="login-email"
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

      {/* Mot de passe */}
      <div>
        <label htmlFor="login-password" className={FIELD_LABEL}>Mot de passe</label>
        <div className={FIELD_WRAP}>
          <span className={FIELD_LEAD}><Lock size={17} /></span>
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={trackCaps}
            onKeyUp={trackCaps}
            disabled={submitting}
            placeholder="Votre mot de passe"
            autoComplete="current-password"
            className={`${FIELD_INPUT} pr-0`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            className="grid place-items-center px-3.5 text-[#9CB2A4] transition-colors hover:text-[#E8C76C]"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {capsOn && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#E9B770]">
            <ArrowBigUp size={14} /> Verrouillage des majuscules activé
          </p>
        )}
      </div>

      {/* Mot de passe oublié */}
      <div className="-mt-1 flex justify-end">
        <button
          type="button"
          onClick={onForgot}
          className="text-[13px] font-semibold text-[#E8C76C] transition-colors hover:text-[#F0D98A]"
        >
          Mot de passe oublié ?
        </button>
      </div>

      {/* Soumission */}
      <button type="submit" disabled={submitting} className={CTA_CLASS} style={{ background: CTA_GRADIENT }}>
        {submitting && <Loader2 size={17} className="animate-spin motion-reduce:animate-none" />}
        {submitting ? 'Connexion en cours' : 'Se connecter'}
      </button>
    </form>
  )
}
