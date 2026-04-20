/**
 * SetPasswordForm — dark-themed password set form for the vault.
 */

import type { FormEvent } from 'react'
import { Lock } from 'lucide-react'

interface SetPasswordFormProps {
  password: string
  confirm: string
  error: string | null
  submitting: boolean
  onPasswordChange: (value: string) => void
  onConfirmChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
}

export function SetPasswordForm({
  password,
  confirm,
  error,
  submitting,
  onPasswordChange,
  onConfirmChange,
  onSubmit,
}: SetPasswordFormProps): JSX.Element {
  return (
    <div className="w-full max-w-sm">
      <p className="mb-1 text-center text-[14px] font-semibold text-white/80">
        D{'\u00e9'}finissez votre mot de passe
      </p>
      <p className="mb-6 text-center text-[12px] text-white/30">
        Bienvenue sur la plateforme G{'\u00eb'}stu
      </p>

      <form onSubmit={onSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-[13px] text-red-300">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="new-password"
            className="mb-1.5 block text-[12px] font-medium text-white/40"
          >
            Nouveau mot de passe
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25">
              <Lock size={16} />
            </span>
            <input
              id="new-password"
              type="password"
              required
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
              minLength={8}
              disabled={submitting}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-[13px] text-white placeholder-white/20 outline-none transition-all focus:border-[#D4A843]/50 focus:shadow-[0_0_0_3px_rgba(212,168,67,0.15)] disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-1.5 block text-[12px] font-medium text-white/40"
          >
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25">
              <Lock size={16} />
            </span>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirm}
              onChange={(e) => onConfirmChange(e.target.value)}
              placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
              minLength={8}
              disabled={submitting}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-[13px] text-white placeholder-white/20 outline-none transition-all focus:border-[#D4A843]/50 focus:shadow-[0_0_0_3px_rgba(212,168,67,0.15)] disabled:opacity-50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl py-3 text-[14px] font-semibold text-[#1B4332] transition-all disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #D4A843 0%, #E2C26B 100%)',
          }}
        >
          {submitting ? 'Enregistrement...' : 'D\u00e9finir mon mot de passe'}
        </button>
      </form>
    </div>
  )
}
