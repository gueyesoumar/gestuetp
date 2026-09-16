import { useState } from 'react'
import type { PlatformPasswordPolicy, PlatformPasswordPolicyUpdate } from '../../types/database.types'

interface Props {
  policy: PlatformPasswordPolicy
  saving: boolean
  onSave: (fields: PlatformPasswordPolicyUpdate) => void
}

type BoolKey = 'require_upper' | 'require_lower' | 'require_digit' | 'require_symbol' | 'forbid_common' | 'check_hibp'

const TOGGLES: { key: BoolKey; label: string; hint?: string }[] = [
  { key: 'require_upper', label: 'Exiger une majuscule' },
  { key: 'require_lower', label: 'Exiger une minuscule' },
  { key: 'require_digit', label: 'Exiger un chiffre' },
  { key: 'require_symbol', label: 'Exiger un symbole', hint: 'Déconseillé par NIST' },
  { key: 'forbid_common', label: 'Bloquer les mots de passe courants' },
  { key: 'check_hibp', label: 'Vérifier les fuites connues (HIBP)', hint: 'Recommandé' },
]

export function PasswordPolicyForm({ policy, saving, onSave }: Props): JSX.Element {
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
      rotation_days: form.rotation_days && form.rotation_days > 0 ? form.rotation_days : null,
      history_count: form.history_count,
    })
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <Card title="Complexité" desc="Exigences appliquées à chaque nouveau mot de passe.">
        <div className="grid grid-cols-2 gap-4 mb-2">
          <NumberField label="Longueur minimale" value={form.min_length} min={8} max={72} onChange={(v) => setNum('min_length', v)} />
          <NumberField label="Caractères différents min." value={form.min_unique} min={1} max={72} onChange={(v) => setNum('min_unique', v)} />
        </div>
        <div className="divide-y divide-gray-100 border-t border-gray-100 mt-2">
          {TOGGLES.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-4 py-3">
              <span className="text-[12.5px] text-gray-800">
                {t.label}
                {t.hint && <span className="ml-2 text-[11px] text-gray-400">{t.hint}</span>}
              </span>
              <Toggle checked={form[t.key]} onChange={(v) => setForm((f) => ({ ...f, [t.key]: v }))} />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Expiration &amp; historique" desc="Déconseillés par NIST — à activer seulement si un référentiel l’impose.">
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Expiration (jours, 0 = désactivée)" value={form.rotation_days ?? 0} min={0} max={3650}
            onChange={(v) => setForm((f) => ({ ...f, rotation_days: v > 0 ? v : null }))} />
          <NumberField label="Historique non-réutilisation (0 = désactivé)" value={form.history_count} min={0} max={24}
            onChange={(v) => setForm((f) => ({ ...f, history_count: v }))} />
        </div>
        <p className="mt-3 text-[11px] text-gray-400">
          L’activation de la rotation démarre le compteur pour tous les comptes (aucun verrouillage immédiat).
        </p>
      </Card>

      <button type="button" onClick={submit} disabled={saving}
        className="rounded-lg bg-forest-700 hover:bg-forest-900 px-5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50">
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  )
}

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100">
        <h2 className="text-[13.5px] font-bold text-gray-900">{title}</h2>
        {desc && <p className="text-[11.5px] text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-forest-700' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
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
