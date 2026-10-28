import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import type { OrgSector, SectorUsage } from './useOrgSectors'

interface DeactivateSectorDialogProps {
  sector: OrgSector
  usage: SectorUsage
  options: OrgSector[]
  busy: boolean
  onReassignAndArchive: (toLabel: string) => void
  onArchive: () => void
  onClose: () => void
}

export function DeactivateSectorDialog({
  sector, usage, options, busy, onReassignAndArchive, onArchive, onClose,
}: DeactivateSectorDialogProps): JSX.Element {
  const [target, setTarget] = useState('')
  return (
    <Modal open onClose={onClose} title={`Désactiver « ${sector.label} »`}>
      <div className="space-y-4 text-sm text-gray-700">
        <p>Ce secteur est utilisé par :</p>
        <ul className="space-y-1 text-[13px]">
          <li><b>{usage.entities}</b> entité(s)</li>
          <li><b>{usage.templates}</b> modèle(s) de risque sectoriel(s)</li>
          {usage.assignments > 0 && <li><b>{usage.assignments}</b> affectation(s) de supervision</li>}
        </ul>
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[12px] text-amber-700">
          Réaffecter déplace ces éléments vers le secteur cible et recompose la répartition (et l&rsquo;exposition moyenne) du radar. Archiver sans réaffecter conserve le libellé sur les éléments existants, mais le retire des nouvelles saisies.
        </div>
        <div>
          <label className="block text-[12px] font-medium text-gray-600 mb-1">Réaffecter vers</label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={busy}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700"
          >
            <option value="">Choisir un secteur cible</option>
            {options.map((o) => (<option key={o.id} value={o.label}>{o.label}</option>))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50">Annuler</button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onArchive}
              disabled={busy}
              className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Archiver quand même
            </button>
            <button
              type="button"
              onClick={() => onReassignAndArchive(target)}
              disabled={busy || !target}
              className="px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50"
            >
              Réaffecter puis archiver
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
