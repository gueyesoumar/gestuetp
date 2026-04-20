/**
 * LoginForm — dark-themed login form for the vault.
 */

import type { FormEvent } from 'react'
import { Mail, Lock } from 'lucide-react'

interface LoginFormProps {
  email: string
  password: string
  error: string | null
  submitting: boolean
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
}

export function LoginForm({
  email,
  password,
  error,
  submitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps): JSX.Element {
  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-[13px] text-red-300">
          {error}
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="login-email" className="mb-1.5 block text-[12px] font-medium text-white/40">
          Adresse email
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25">
            <Mail size={16} />
          </span>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            disabled={submitting}
            placeholder="vous@exemple.com"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-[13px] text-white placeholder-white/20 outline-none transition-all focus:border-[#D4A843]/50 focus:shadow-[0_0_0_3px_rgba(212,168,67,0.15)] disabled:opacity-50"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label htmlFor="login-password" className="mb-1.5 block text-[12px] font-medium text-white/40">
          Mot de passe
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25">
            <Lock size={16} />
          </span>
          <input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            disabled={submitting}
            placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-[13px] text-white placeholder-white/20 outline-none transition-all focus:border-[#D4A843]/50 focus:shadow-[0_0_0_3px_rgba(212,168,67,0.15)] disabled:opacity-50"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl py-3 text-[14px] font-semibold text-[#1B4332] transition-all disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #D4A843 0%, #E2C26B 100%)',
        }}
      >
        {submitting ? 'Connexion...' : 'Acc\u00e9der \u00e0 la plateforme'}
      </button>

      <p className="text-center">
        <a
          href="#"
          className="text-[12px] text-white/30 transition-colors hover:text-[#D4A843]"
        >
          Mot de passe oubli{'\u00e9'} ?
        </a>
      </p>
    </form>
  )
}
