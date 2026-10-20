import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { VENDOR_DATA_ACCESS_OPTIONS, VENDOR_CRITICALITY_OPTIONS, SECTEURS_OPTIONS, PAYS_OPTIONS } from '../../lib/constants'
import type { CreateVendorInput } from './useVendors'

const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-500 focus:ring-1 focus:ring-forest-500'
const label = 'block text-[12px] font-medium text-gray-600 mb-1'

interface Props {
  busy: boolean
  onClose: () => void
  onCreate: (input: CreateVendorInput) => Promise<boolean>
}

/** Formulaire de création d'un tiers / fournisseur (RFC 0020 Lot 1). */
export function CreateVendorModal({ busy, onClose, onCreate }: Props): JSX.Element {
  const [f, setF] = useState<CreateVendorInput>({ vendor_name: '', data_access_level: 'aucun', criticality: 'standard' })
  const set = (k: keyof CreateVendorInput, v: string): void => setF((p) => ({ ...p, [k]: v }))

  const submit = async (): Promise<void> => {
    if (!f.vendor_name.trim()) return
    const ok = await onCreate(f)
    if (ok) onClose()
  }

  return (
    <Modal open onClose={onClose} title="Nouveau fournisseur">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={label}>Nom du fournisseur <span className="text-red-500">*</span></label>
          <input className={field} value={f.vendor_name} onChange={(e) => set('vendor_name', e.target.value)} autoFocus />
        </div>
        <div>
          <label className={label}>Numéro d&apos;immatriculation</label>
          <input className={field} value={f.registration_number ?? ''} onChange={(e) => set('registration_number', e.target.value)} />
        </div>
        <div>
          <label className={label}>Pays</label>
          <select className={field} value={f.country ?? ''} onChange={(e) => set('country', e.target.value)}>
            <option value="">-</option>
            {PAYS_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Secteur</label>
          <select className={field} value={f.sector ?? ''} onChange={(e) => set('sector', e.target.value)}>
            <option value="">-</option>
            {SECTEURS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Accès aux données</label>
          <select className={field} value={f.data_access_level} onChange={(e) => set('data_access_level', e.target.value)}>
            {VENDOR_DATA_ACCESS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Criticité</label>
          <select className={field} value={f.criticality} onChange={(e) => set('criticality', e.target.value)}>
            {VENDOR_CRITICALITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Référence interne</label>
          <input className={field} value={f.internal_ref ?? ''} onChange={(e) => set('internal_ref', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={label}>Services rendus</label>
          <textarea className={field} rows={2} value={f.services ?? ''} onChange={(e) => set('services', e.target.value)} />
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} disabled={busy} className="px-4 py-2 rounded-lg text-[13px] font-medium text-gray-500 hover:text-gray-700">Annuler</button>
        <button onClick={() => void submit()} disabled={busy || !f.vendor_name.trim()} className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white bg-forest-700 hover:bg-forest-900 disabled:opacity-50">
          {busy ? 'En cours...' : 'Ajouter'}
        </button>
      </div>
    </Modal>
  )
}
