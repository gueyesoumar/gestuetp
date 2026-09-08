import { useState } from 'react'
import type { PlatformPasswordPolicy, PlatformPasswordPolicyUpdate } from '../../types/database.types'

interface Props {
  policy: PlatformPasswordPolicy
  saving: boolean
  status: { ok: boolean; msg: string } | null
  onSave: (fields: PlatformPasswordPolicyUpdate) => void
}

type BoolKey = 'require_upper' | 'require_lower' | 'require_digit' | 'require_symbol' | 'forbid_common' | 'check_hibp'

const TOGGLES: { key: BoolKey; label: string; hint?: string }[] = [
  { key: 'require_upper', label: 'Exiger une majuscule' },
  { key: 'require_lower', label: 'Exiger une minuscule' },
  { key: 'require_digit', label: 'Exiger un chiffre' },
  { key: 'require_symbol', label: 'Exiger un symbole', hint: 'Déconseillé par NIST — à activer si un référentiel l’impose' },
  { key: 'forbid_common', label: 'Bloquer les mots de passe courants' },
  { key: 'check_hibp', label: 'Vérifier les fuites connues (HIBP)', hint: 'Recommandé' },
]

export function PasswordPolicyForm({ policy, saving, status, onSave }: Props): JSX.Element {
  const [form, setForm] = useState<PlatformPasswordPolicy>(policy)

  const setNum = (key: 'min_length' | 'min_unique', value: number): void =>
    setForm((f) => ({ ...f, [key]: value }))

  const submit = (): void => {
    onSave({
      min_length: form.min_length,
      min_unique: form.min_unique,
      require_upper: form.require_upper,
      require_lower: form.require_lower,
      require_digit: form.require_digit,
      require_symbol: form.require_symbol,
      forbid_common: form.forbid_common,
      check_hibp: form.check_hibp,
    })
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="grid grid-cols-2 gap-4">
        <NumberField label="Longueur minimale" value={form.min_length} min={8} max={72}
          onChange={(v) => setNum('min_length', v)} />
        <NumberField label="Caractères différents min." value={form.min_unique} min={1} max={72}
          onChange={(v) => setNum('min_unique', v)} />
      </section>

      <section className="divide-y divide-gray-100 rounded-xl border border-gray-200">
        {TOGGLES.map((t) => (
          <label key={t.key} className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
            <span className="text-[13px] text-gray-800">
              {t.label}
              {t.hint && <span className="ml-2 text-[11px] text-gray-400">{t.hint}</span>}
            </span>
            <input type="checkbox" checked={form[t.key]}
              onChange={(e) => setForm((f) => ({ ...f, [t.key]: e.target.checked }))}
              className="h-4 w-4 accent-[#1B4332]" />
          </label>
        ))}
      </section>

      <section className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Phase 2 — bientôt</p>
        <p className="mt-1 text-[12px] text-gray-500">
          Rotation (expiration) et historique de non-réutilisation seront activables ici. Désactivés pour l&apos;instant.
        </p>
      </section>

      <div className="flex items-center gap-4">
        <button type="button" onClick={submit} disabled={saving}
          className="rounded-lg bg-[#1B4332] px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {status && (
          <span className={`text-[12px] ${status.ok ? 'text-[#40916C]' : 'text-red-500'}`}>{status.msg}</span>
        )}
      </div>
    </div>
  )
}

function NumberField({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void
}): JSX.Element {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-gray-700">{label}</span>
      <input type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
        className="rounded-lg border border-gray-200 px-3 py-2 text-[13px]" />
    </label>
  )
}
