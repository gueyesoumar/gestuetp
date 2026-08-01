import { Modal } from '../../../components/ui/Modal'

interface FindingCounts {
  major_nc: number
  minor_nc: number
  observation: number
}

interface ActionPlanPreviewModalProps {
  open: boolean
  busy: boolean
  findings: FindingCounts
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

export function ActionPlanPreviewModal({ open, busy, findings, onClose, onConfirm }: ActionPlanPreviewModalProps): JSX.Element | null {
  const total = findings.major_nc + findings.minor_nc + findings.observation
  const hasFindings = total > 0

  return (
    <Modal open={open} onClose={onClose} title="Générer le plan d'action">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Cette op&eacute;ration cr&eacute;e une demande d&apos;action corrective (CAR) pour chaque constat
          class&eacute; major_nc, minor_nc ou observation. Les CAR existantes ne sont pas dupliqu&eacute;es.
        </p>

        {!hasFindings ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            Aucun constat class&eacute; n&apos;a &eacute;t&eacute; identifi&eacute; sur cette mission.
            Pour g&eacute;n&eacute;rer un plan d&apos;action, classez d&apos;abord vos constats dans la phase
            &laquo;&nbsp;Revue interne&nbsp;&raquo;.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="NC majeures" value={findings.major_nc} color="text-red-600" bg="bg-red-50 border-red-200" />
            <Stat label="NC mineures" value={findings.minor_nc} color="text-orange-600" bg="bg-orange-50 border-orange-200" />
            <Stat label="Observations" value={findings.observation} color="text-blue-600" bg="bg-blue-50 border-blue-200" />
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
          &Eacute;ch&eacute;ance par d&eacute;faut : <strong>+90 jours</strong> apr&egrave;s la fin de mission pour les NC,
          <strong> +180 jours</strong> pour les observations. Modifiable individuellement ensuite.
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={busy || !hasFindings}
            className="px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-800 disabled:opacity-50"
          >
            {busy ? 'Génération...' : `Générer ${total} action${total > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Stat({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }): JSX.Element {
  return (
    <div className={`rounded-lg border p-3 text-center ${bg}`}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] font-medium text-gray-600 mt-0.5">{label}</p>
    </div>
  )
}
