import { FileCheck2, FileWarning, Share2, FilePlus2 } from 'lucide-react'
import { useControlExpectedEvidence, type ExpectedEvidence } from './useControlExpectedEvidence'

interface ExpectedEvidenceSectionProps {
  missionId: string
  controlId: string
  /** Crée un constat rattaché à la preuve (et le propage aux contrôles partageant la preuve). */
  onCreateFinding?: (item: ExpectedEvidence) => void
}

/**
 * Preuves attendues du contrôle (référentiel) : état fourni/manquant via la
 * preuve canonique (evidence_item_id) et badge « partagée » quand la même preuve
 * couvre plusieurs contrôles.
 */
export function ExpectedEvidenceSection({ missionId, controlId, onCreateFinding }: ExpectedEvidenceSectionProps) {
  const { items, loading } = useControlExpectedEvidence(missionId, controlId)
  if (loading || items.length === 0) return null

  const covered = items.filter((i) => i.fulfilled).length

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">
        Attendues <span className="font-normal normal-case">· {covered}/{items.length} fournies</span>
      </p>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-2.5 rounded-lg border border-gray-100 bg-white px-3 py-2">
            <span className={`mt-0.5 shrink-0 ${it.fulfilled ? 'text-green-600' : 'text-gray-300'}`}>
              {it.fulfilled ? <FileCheck2 size={15} /> : <FileWarning size={15} />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-gray-900 flex items-center gap-1.5 flex-wrap">
                {it.name}
                {it.isRequired && (
                  <span className="text-[9px] font-bold uppercase tracking-wide text-red-600 bg-red-50 rounded px-1.5 py-0.5">Requis</span>
                )}
                {it.sharedControlCount > 1 && (
                  <span className="text-[9px] font-bold uppercase tracking-wide text-forest-700 bg-forest-50 border border-forest-200 rounded px-1.5 py-0.5 inline-flex items-center gap-1" title="Preuve mutualisée : couvre plusieurs contrôles">
                    <Share2 size={9} /> Partag&eacute;e &middot; {it.sharedControlCount} contr&ocirc;les
                  </span>
                )}
              </p>
              {it.description && <p className="text-[10px] text-gray-400 leading-snug">{it.description}</p>}
              {it.fulfilled && it.fulfilledFileName && (
                <p className="text-[10px] text-green-700 truncate mt-0.5">&#x2713; {it.fulfilledFileName}</p>
              )}
              {onCreateFinding && !it.fulfilled && (
                <button
                  type="button"
                  onClick={() => onCreateFinding(it)}
                  className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-forest-700 hover:text-forest-900"
                  title={it.sharedControlCount > 1 ? 'Crée un constat et le propage aux contrôles partageant cette preuve' : 'Crée un constat lié à cette preuve'}
                >
                  <FilePlus2 size={11} /> Constat{it.sharedControlCount > 1 ? ' (propagé)' : ''}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
