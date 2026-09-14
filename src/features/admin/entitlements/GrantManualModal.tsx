import { useState } from 'react'
import type { EntitlementAction } from './useOrgEntitlements'

const PRICING_KINDS = ['none', 'flat', 'per_unit', 'metered'] as const
const PRICE_UNITS = ['month', 'year', 'seat', 'mission', 'assujetti', 'client', 'subsidiary', 'credit'] as const

const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700'
const label = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1'

interface Props {
  onClose: () => void
  onSubmit: (a: EntitlementAction) => Promise<boolean>
  busy: boolean
}

/** Octroi d'un droit MANUEL (source='manual', ex. ai_credits). Motif obligatoire. */
export function GrantManualModal({ onClose, onSubmit, busy }: Props) {
  const [key, setKey] = useState('')
  const [capability, setCapability] = useState('')
  const [pricingKind, setPricingKind] = useState<string>('none')
  const [priceAmount, setPriceAmount] = useState('')
  const [priceUnit, setPriceUnit] = useState('')
  const [limitValue, setLimitValue] = useState('')
  const [enforcement, setEnforcement] = useState('soft')
  const [reason, setReason] = useState('')

  const canSubmit = key.trim().length > 0 && reason.trim().length > 0 && !busy

  const submit = async () => {
    const ok = await onSubmit({
      action: 'grant_manual',
      key: key.trim(),
      reason: reason.trim(),
      capability: capability.trim() || null,
      pricing_kind: pricingKind,
      price_amount: priceAmount ? Number(priceAmount) : null,
      price_unit: priceUnit || null,
      limit_value: limitValue ? Number(limitValue) : null,
      enforcement,
    })
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-[14.5px] font-bold text-gray-900">Octroyer un droit manuel</h3>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={label}>Clé <span className="text-red-500">*</span></label>
            <input className={field} value={key} onChange={(e) => setKey(e.target.value)} placeholder="ex. ai_credits" />
          </div>
          <div>
            <label className={label}>Capacité (optionnel)</label>
            <input className={field} value={capability} onChange={(e) => setCapability(e.target.value)} placeholder="ex. risk" />
          </div>
          <div>
            <label className={label}>Enforcement</label>
            <select className={field} value={enforcement} onChange={(e) => setEnforcement(e.target.value)}>
              <option value="soft">soft (UX)</option>
              <option value="hard">hard (serveur)</option>
            </select>
          </div>
          <div>
            <label className={label}>Type de prix</label>
            <select className={field} value={pricingKind} onChange={(e) => setPricingKind(e.target.value)}>
              {PRICING_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Unité</label>
            <select className={field} value={priceUnit} onChange={(e) => setPriceUnit(e.target.value)}>
              <option value="">—</option>
              {PRICE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Montant (FCFA)</label>
            <input className={field} type="number" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={label}>Plafond (métré)</label>
            <input className={field} type="number" value={limitValue} onChange={(e) => setLimitValue(e.target.value)} placeholder="illimité" />
          </div>
          <div className="col-span-2">
            <label className={label}>Motif <span className="text-red-500">*</span></label>
            <textarea rows={2} className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
            <p className="mt-1.5 text-[11px] text-gray-400">Tracé dans l&apos;audit log.</p>
          </div>
        </div>
        <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button onClick={submit} disabled={!canSubmit} className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg text-white bg-forest-700 hover:bg-forest-900 disabled:opacity-50">Octroyer</button>
        </div>
      </div>
    </div>
  )
}
