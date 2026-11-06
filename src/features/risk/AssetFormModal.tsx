import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../hooks/useToast'
import { RISK_ASSET_CATEGORIES, ASSET_CRITICALITY_OPTIONS } from '../../lib/constants'
import type { AssetInput, RiskAssetRow } from './useRiskAssets'

interface Props {
  asset: RiskAssetRow | null
  businessValues: Array<{ id: string; name: string }>
  onSubmit: (a: AssetInput) => Promise<boolean>
  onClose: () => void
}

const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700'
const lbl = 'block text-[12px] font-medium text-gray-600 mb-1'

/** Modal créer / éditer un actif (bien support) du registre de risque. */
export function AssetFormModal({ asset, businessValues, onSubmit, onClose }: Props): JSX.Element {
  const toast = useToast()
  const [name, setName] = useState(asset?.name ?? '')
  const [category, setCategory] = useState(asset?.category ?? RISK_ASSET_CATEGORIES[0].value)
  const [criticality, setCriticality] = useState<'eleve' | 'standard'>(asset?.criticality ?? 'standard')
  const [bv, setBv] = useState(asset?.business_value_id ?? '')
  const [description, setDescription] = useState(asset?.description ?? '')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Nom requis'); return }
    setBusy(true)
    const ok = await onSubmit({
      name: name.trim(), category, criticality,
      business_value_id: bv || null, description: description.trim() || null,
    })
    setBusy(false)
    if (!ok) { toast.error('Enregistrement impossible'); return }
    toast.success(asset ? 'Actif mis à jour' : 'Actif ajouté')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={asset ? "Modifier l'actif" : 'Nouvel actif'}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className={lbl}>Nom *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="ex. Serveur de production, Base assurés" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Catégorie</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
              {RISK_ASSET_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Criticité</label>
            <select value={criticality} onChange={(e) => setCriticality(e.target.value as 'eleve' | 'standard')} className={field}>
              {ASSET_CRITICALITY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={lbl}>Valeur métier rattachée <span className="text-gray-400 font-normal">(optionnel)</span></label>
          <select value={bv} onChange={(e) => setBv(e.target.value)} className={field}>
            <option value="">Aucune</option>
            {businessValues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Description <span className="text-gray-400 font-normal">(optionnel)</span></label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={field} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button type="submit" disabled={busy || !name.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
            {busy ? 'Enregistrement...' : asset ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
