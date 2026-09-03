/**
 * LoginForm — dark-themed login form for the vault.
 */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

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

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-[13px] text-red-300">
          {error}
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="login-email" className="mb-1.5 block text-[12px] font-medium text-white/[0.72]">
          Adresse email
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
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
            className="w-full rounded-xl border border-white/[0.15] bg-white/5 py-3 pl-11 pr-4 text-[14px] text-white placeholder-white/30 outline-none transition-all focus:border-[#D4A843]/50 focus:shadow-[0_0_0_3px_rgba(212,168,67,0.15)] disabled:opacity-50"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label htmlFor="login-password" className="mb-1.5 block text-[12px] font-medium text-white/[0.72]">
          Mot de passe
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
            <Lock size={16} />
          </span>
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            disabled={submitting}
            placeholder={'••••••••'}
            className="w-full rounded-xl border border-white/[0.15] bg-white/5 py-3 pl-11 pr-11 text-[14px] text-white placeholder-white/30 outline-none transition-all focus:border-[#D4A843]/50 focus:shadow-[0_0_0_3px_rgba(212,168,67,0.15)] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-white/40 transition-colors hover:text-white/70"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      {/* Forgot */}
      <div className="flex justify-end -mt-1">
        <button
          type="button"
          onClick={onForgot}
          className="text-[12px] text-[#E2C26B] transition-colors hover:text-[#F0D98A]"
        >
          Mot de passe oublié ?
        </button>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl py-3 text-[14px] font-bold text-[#1B4332] transition-all disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #D4A843 0%, #E2C26B 100%)',
        }}
      >
        {submitting ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  )
}
