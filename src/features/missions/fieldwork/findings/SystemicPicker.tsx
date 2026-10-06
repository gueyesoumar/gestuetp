import { useState } from 'react'
import { X, GitBranch } from 'lucide-react'
import { Modal } from '../../../../components/ui/Modal'
import type { LinkedTarget } from '../interControl'

interface SystemicPickerProps {
  controlCode: string
  findingLabel: string
  targets: LinkedTarget[]
  saving: boolean
  onConfirm: (assessmentIds: string[]) => void
  onClose: () => void
}

/**
 * Sélection des contrôles liés (crosswalk) vers lesquels répliquer un constat systémique.
 * Ne propose que les contrôles dont l'auditeur possède un assessment modifiable (draft/rejeté).
 */
export function SystemicPicker({ controlCode, findingLabel, targets, saving, onConfirm, onClose }: SystemicPickerProps): JSX.Element {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <Modal open onClose={onClose} title="Constat systémique">
      <div className="space-y-4">
        <div className="rounded-lg border border-forest-100 bg-forest-50/60 px-3 py-2.5">
          <p className="text-[11px] text-forest-800 leading-relaxed">
            Ce constat de <span className="font-mono font-semibold">{controlCode}</span> sera répliqué sur les contrôles liés sélectionnés.
            Une seule action corrective couvrira l&apos;ensemble du groupe.
          </p>
          <p className="text-[11px] text-gray-500 italic mt-1">&laquo;&nbsp;{findingLabel}&nbsp;&raquo;</p>
        </div>

        {targets.length === 0 ? (
          <p className="text-[12px] text-gray-500 py-4 text-center">
            Aucun contrôle lié éligible (il faut un contrôle lié dont vous avez le brouillon ouvert).
          </p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {targets.map((t) => (
              <label key={t.assessmentId} className="flex items-start gap-2.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(t.assessmentId)}
                  onChange={() => toggle(t.assessmentId)}
                  className="mt-0.5 w-3.5 h-3.5 accent-forest-700 shrink-0"
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-semibold text-gray-900">
                    <span className="font-mono text-forest-700">{t.code}</span> {t.name}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-gray-400">{t.relationship}</span>
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={saving}
            className="px-3 py-2 text-[12px] font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1.5">
            <X size={12} /> Annuler
          </button>
          <button type="button" onClick={() => onConfirm([...selected])} disabled={selected.size === 0 || saving}
            className="px-3 py-2 text-[12px] font-semibold text-white bg-forest-700 hover:bg-forest-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg inline-flex items-center gap-1.5">
            <GitBranch size={12} /> {saving ? 'Création...' : `Créer le constat systémique (${selected.size})`}
          </button>
        </div>
      </div>
    </Modal>
  )
}
