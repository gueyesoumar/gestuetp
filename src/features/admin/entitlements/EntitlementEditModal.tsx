import { useState } from 'react'
import type { EntitlementAction } from './useOrgEntitlements'
import type { OrgEntitlementEntry } from '../../../types/database.types'

const PRICING_KINDS = ['none', 'flat', 'per_unit', 'metered'] as const
const PRICE_UNITS = ['month', 'year', 'seat', 'mission', 'assujetti', 'client', 'subsidiary', 'credit'] as const
const STATUSES = ['active', 'trial', 'suspended'] as const

const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700'
const label = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1'

interface Props {
  entry: OrgEntitlementEntry
  onClose: () => void
  onSubmit: (a: EntitlementAction) => Promise<boolean>
  busy: boolean
}

/** Édition d'un entitlement existant : statut + prix + gate (+ retrait si manuel). */
export function EntitlementEditModal({ entry, onClose, onSubmit, busy }: Props) {
  const [status, setStatus] = useState<string>(entry.status)
  const [enforcement, setEnforcement] = useState<string>(entry.enforcement)
  const [pricingKind, setPricingKind] = useState<string>(entry.pricing_kind)
  const [priceAmount, setPriceAmount] = useState(entry.price_amount?.toString() ?? '')
  const [priceUnit, setPriceUnit] = useState(entry.price_unit ?? '')
  const [limitValue, setLimitValue] = useState(entry.limit_value?.toString() ?? '')
  const [reason, setReason] = useState('')
  const canSubmit = reason.trim().length > 0 && !busy

  const save = async () => {
    let ok = await onSubmit({
      action: 'set_attributes', key: entry.key, reason: reason.trim(),
      enforcement, pricing_kind: pricingKind,
      price_amount: priceAmount ? Number(priceAmount) : null,
      price_unit: priceUnit || null,
      limit_value: limitValue ? Number(limitValue) : null,
    })
    if (ok && status !== entry.status) {
      ok = await onSubmit({ action: 'set_status', key: entry.key, reason: reason.trim(), status })
    }
    if (ok) onClose()
  }

  const remove = async () => {
    const ok = await onSubmit({ action: 'remove_manual', key: entry.key, reason: reason.trim() })
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-[14.5px] font-bold text-gray-900">Éditer &laquo; {entry.key} &raquo;</h3>
          <p className="text-[11.5px] text-gray-500 mt-0.5">Source : {entry.source}{entry.capability ? ` · capacité ${entry.capability}` : ''}</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Statut</label>
            <select className={field} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
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
            <input className={field} type="number" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} />
          </div>
          <div>
            <label className={label}>Plafond</label>
            <input className={field} type="number" value={limitValue} onChange={(e) => setLimitValue(e.target.value)} placeholder="illimité" />
          </div>
          <div className="col-span-2">
            <label className={label}>Motif <span className="text-red-500">*</span></label>
            <textarea rows={2} className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex items-center gap-2">
          {entry.source === 'manual' && (
            <button onClick={remove} disabled={!canSubmit} className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">Retirer</button>
          )}
          <button onClick={onClose} className="ml-auto px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button onClick={save} disabled={!canSubmit} className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg text-white bg-forest-700 hover:bg-forest-900 disabled:opacity-50">Enregistrer</button>
        </div>
      </div>
    </div>
  )
}
