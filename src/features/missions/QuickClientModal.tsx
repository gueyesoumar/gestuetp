import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { useCreateCabinetClient } from '../clients/useCreateCabinetClient'
import { SECTEURS_OPTIONS } from '../../lib/constants'

interface QuickClientModalProps {
  open: boolean
  onClose: () => void
  /** Appelé avec l'id du client créé (pour rafraîchir la liste et le sélectionner). */
  onCreated: (clientId: string) => void
}

/**
 * Création rapide d'un client depuis le wizard de mission, sans perdre la saisie
 * en cours (remplace la navigation vers /clients/nouveau). Seul le nom est requis ;
 * la fiche complète reste éditable ensuite.
 */
export function QuickClientModal({ open, onClose, onCreated }: QuickClientModalProps) {
  const { createClient, creating, error } = useCreateCabinetClient()
  const [name, setName] = useState('')
  const [sector, setSector] = useState('')
  const [city, setCity] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) return
    const id = await createClient({
      client_name: name.trim(),
      client_sector: sector || null,
      client_city: city.trim() || null,
    })
    if (id) {
      setName('')
      setSector('')
      setCity('')
      onCreated(id)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouveau client">
      <div className="space-y-3">
        <div>
          <label className="block text-[12px] font-medium text-gray-700 mb-1">
            Nom du client<span className="text-red-500 ml-0.5">*</span>
          </label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full" placeholder="Ex : Client Demo SA" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">Secteur</label>
            <select value={sector} onChange={(e) => setSector(e.target.value)} className="w-full">
              <option value="">—</option>
              {SECTEURS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">Ville</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full" placeholder="Dakar" />
          </div>
        </div>
        <p className="text-[11px] text-gray-400">
          Vous pourrez compléter la fiche (immatriculation, exigences, parties intéressées…) plus tard.
        </p>
        {error && <p className="text-[12px] font-medium text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="rounded-lg bg-forest-700 px-4 py-2 text-[13px] font-semibold text-white hover:bg-forest-900 disabled:opacity-50"
          >
            {creating ? 'Création...' : 'Créer et sélectionner'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
