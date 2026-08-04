import { useState } from 'react'
import { X } from 'lucide-react'
import { ENTITY_TYPE_OPTIONS, SECTEURS_OPTIONS, PAYS_OPTIONS, CRITICALITY_OPTIONS, REG_STATUS_OPTIONS } from '../../lib/constants'
import type { EntityType } from '../../lib/constants'
import { useVocab } from '../edition/useVocab'
import { useIsRegul } from '../edition/useIsRegul'
import { useManageEntity, type EntityInput, type RegulatoryProfile } from './useManageEntity'
import { useToast } from '../../hooks/useToast'

export interface EntityFormValue {
  id?: string
  name: string
  entity_type: EntityType | null
  parent_org_id: string | null
  sector: string | null
  city: string | null
  country: string | null
  /** Profil réglementaire (Regul) — null en mode Comply. */
  regulatoryProfile?: RegulatoryProfile | null
}

interface ParentOption { id: string; name: string }

interface Props {
  /** Valeur initiale (édition) ou null (création). */
  initial: EntityFormValue | null
  /** Entités pouvant servir de parent (racine du groupe = null). */
  parentOptions: ParentOption[]
  onClose: () => void
  onSaved: () => void
}

/** Modale création / édition d'une entité interne de groupe. */
export function EntityFormModal({ initial, parentOptions, onClose, onSaved }: Props): JSX.Element {
  const vocab = useVocab()
  const isRegul = useIsRegul()
  const toast = useToast()
  const { busy, createEntity, updateEntity } = useManageEntity()
  const isEdit = !!initial?.id
  const [name, setName] = useState(initial?.name ?? '')
  const [entityType, setEntityType] = useState<EntityType | ''>(initial?.entity_type ?? '')
  const [parentId, setParentId] = useState<string>(initial?.parent_org_id ?? '')
  const [sector, setSector] = useState(initial?.sector ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [country, setCountry] = useState(initial?.country ?? '')
  const rp = initial?.regulatoryProfile
  const [criticality, setCriticality] = useState<'eleve' | 'standard' | 'indetermine'>(rp?.criticality ?? 'indetermine')
  const [regime, setRegime] = useState(rp?.obligation_regime ?? '')
  const [tier, setTier] = useState(rp?.tier ?? '')
  const [regStatus, setRegStatus] = useState<'active' | 'exited'>(rp?.status ?? 'active')

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim() || !entityType) {
      toast.error('Renseignez au moins le nom et le type')
      return
    }
    const payload: Partial<EntityInput> = {
      name: name.trim(),
      entity_type: entityType,
      parent_org_id: parentId || undefined,
      sector: sector || null,
      city: city || null,
      country: country || null,
      ...(isRegul ? {
        criticality,
        obligation_regime: regime || null,
        tier: tier || null,
        reg_status: regStatus,
      } : {}),
    }
    const res = isEdit
      ? await updateEntity(initial!.id!, payload)
      : await createEntity(payload as EntityInput)
    if (!res.ok) {
      toast.error(res.error ?? "Enregistrement impossible")
      return
    }
    toast.success(isEdit ? 'Entité mise à jour' : 'Entité créée')
    onSaved()
  }

  const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{isEdit ? `Modifier — ${vocab.entitySingular}` : `Nouvel${vocab.entityGender === 'f' ? 'le' : ''} ${vocab.entitySingular}`}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Nom *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Type *</label>
              <select value={entityType} onChange={(e) => setEntityType(e.target.value as EntityType)} className={field}>
                <option value="">Sélectionner…</option>
                {ENTITY_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Rattachée à</label>
              <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={field}>
                <option value="">Racine du groupe</option>
                {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Secteur</label>
              <select value={sector} onChange={(e) => setSector(e.target.value)} className={field}>
                <option value="">Non renseigné</option>
                {SECTEURS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Pays</label>
              <select value={country} onChange={(e) => setCountry(e.target.value)} className={field}>
                <option value="">Non renseigné</option>
                {PAYS_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Ville</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className={field} />
          </div>

          {isRegul && (
            <div className="pt-2 mt-1 border-t border-gray-100 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-forest-700">Profil r&eacute;glementaire</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-600 mb-1">Criticit&eacute;</label>
                  <select value={criticality} onChange={(e) => setCriticality(e.target.value as typeof criticality)} className={field}>
                    {CRITICALITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-600 mb-1">Statut de p&eacute;rim&egrave;tre</label>
                  <select value={regStatus} onChange={(e) => setRegStatus(e.target.value as typeof regStatus)} className={field}>
                    {REG_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-600 mb-1">R&eacute;gime d&apos;obligations</label>
                  <input value={regime} onChange={(e) => setRegime(e.target.value)} placeholder="ex. r&eacute;gime renforc&eacute;" className={field} />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-600 mb-1">Tier de criticit&eacute;</label>
                  <input value={tier} onChange={(e) => setTier(e.target.value)} placeholder="ex. Tier 1" className={field} />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
              {busy ? 'Enregistrement…' : isEdit ? 'Enregistrer' : `Créer — ${vocab.entitySingular}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
