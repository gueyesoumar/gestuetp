import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { SubsidiaryRow } from './useSubsidiaries'
import { ENTITY_TYPE_LABELS } from '../../lib/constants'
import { useVocab } from '../edition/useVocab'
import { useIsRegul } from '../edition/useIsRegul'
import { SubsidiaryCardMenu } from './SubsidiaryCardMenu'
import { SubsidiaryCoverage } from './SubsidiaryCoverage'

interface SubsidiaryCardProps {
  subsidiary: SubsidiaryRow
  /** Nom de l'entité parente si rattachée à une autre entité (pas la racine). */
  parentName?: string | null
  /** Si fournis, affiche le menu d'actions (édition / désactivation). */
  onEdit?: (s: SubsidiaryRow) => void
  onDeactivate?: (s: SubsidiaryRow) => void
}

const initials = (name: string): string => name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

/** Carte d'entité du registre (vue secondaire) : identité + badges + couverture.
 * Simplifiée (RFC registre) : le détail vit sur la fiche. Partagée Comply/Regul. */
export function SubsidiaryCard({ subsidiary, parentName, onEdit, onDeactivate }: SubsidiaryCardProps): JSX.Element {
  const vocab = useVocab()
  const isRegul = useIsRegul()
  const { conformityScore, activeMissions, entityType } = subsidiary
  const showActions = !!onEdit || !!onDeactivate

  return (
    <Link
      to={`${vocab.entityRouteBase}/${subsidiary.id}`}
      className="group block rounded-xl border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-forest-300 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-forest-50 text-[12px] font-extrabold text-forest-700">{initials(subsidiary.name)}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-gray-900">{subsidiary.name}</p>
          <p className="truncate text-[12px] text-gray-500">{subsidiary.sector ?? 'Secteur non renseigné'}{parentName ? ` · ${parentName}` : ''}</p>
        </div>
        {showActions && <SubsidiaryCardMenu subsidiary={subsidiary} onEdit={onEdit} onDeactivate={onDeactivate} />}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {entityType && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">{ENTITY_TYPE_LABELS[entityType]}</span>}
        {isRegul && subsidiary.regulatoryProfile?.criticality === 'eleve' && (
          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700" title="Infrastructure d'Information Critique">IIC</span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
        <SubsidiaryCoverage score={conformityScore} activeMissions={activeMissions} />
        <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-forest-700">
          Ouvrir <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}
