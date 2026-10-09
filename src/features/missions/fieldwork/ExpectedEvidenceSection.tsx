import { useRef, useState } from 'react'
import { FileCheck2, FileWarning, Share2, FilePlus2, Upload, Paperclip } from 'lucide-react'
import { useControlExpectedEvidence, type ExpectedEvidence } from './useControlExpectedEvidence'
import { useCadrageDocumentsForControl } from './useCadrageDocumentsForControl'

interface ExpectedEvidenceSectionProps {
  missionId: string
  controlId: string
  /** Crée un constat rattaché à la preuve (et le propage aux contrôles partageant la preuve). */
  onCreateFinding?: (item: ExpectedEvidence) => void
  /** Dépose un document pour une preuve attendue (lié à sa preuve canonique). */
  onUpload?: (file: File, description: string, evidenceItemId?: string | null) => Promise<boolean>
  uploading?: boolean
}

/**
 * Preuves attendues du contrôle : état fourni/manquant via la preuve canonique,
 * badge « partagée », dépôt direct par preuve et création de constat.
 */
export function ExpectedEvidenceSection({ missionId, controlId, onCreateFinding, onUpload, uploading }: ExpectedEvidenceSectionProps) {
  const { items, loading, refetch } = useControlExpectedEvidence(missionId, controlId)
  const cadrage = useCadrageDocumentsForControl(missionId, controlId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<ExpectedEvidence | null>(null)

  if (loading || items.length === 0) return null
  const covered = items.filter((i) => i.fulfilled).length

  // L3 : rattacher un document déjà fourni au cadrage comme preuve de ce contrôle.
  const useFromCadrage = async (item: ExpectedEvidence, docId: string): Promise<void> => {
    if (!item.evidenceItemId) return
    const ok = await cadrage.attach(docId, item.evidenceItemId)
    if (ok) { cadrage.refetch(); setTimeout(() => refetch(), 300) }
  }

  const pickFor = (item: ExpectedEvidence): void => {
    setPending(item)
    if (fileRef.current) { fileRef.current.value = ''; fileRef.current.click() }
  }
  const handleFile = async (): Promise<void> => {
    const file = fileRef.current?.files?.[0]
    if (!file || !pending || !onUpload) return
    const ok = await onUpload(file, `[EVIDENCE:${pending.name}]`, pending.evidenceItemId)
    setPending(null)
    if (ok) setTimeout(() => refetch(), 400)
  }

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">
        Attendues <span className="font-normal normal-case">&middot; {covered}/{items.length} fournies</span>
      </p>
      {onUpload && <input ref={fileRef} type="file" className="hidden" onChange={() => void handleFile()} />}
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
              <div className="flex items-center gap-3 mt-1.5">
                {onUpload && !it.fulfilled && (
                  <button type="button" disabled={uploading} onClick={() => pickFor(it)}
                    className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-forest-700 hover:text-forest-900 disabled:opacity-50">
                    <Upload size={11} /> Déposer
                  </button>
                )}
                {onCreateFinding && !it.fulfilled && (
                  <button type="button" onClick={() => onCreateFinding(it)}
                    className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-gray-500 hover:text-gray-800"
                    title={it.sharedControlCount > 1 ? 'Crée un constat et le propage aux contrôles partageant cette preuve' : 'Crée un constat lié à cette preuve'}>
                    <FilePlus2 size={11} /> Constat{it.sharedControlCount > 1 ? ' (propagé)' : ''}
                  </button>
                )}
              </div>
              {/* L3 : documents déjà fournis au cadrage, réutilisables comme preuve. */}
              {!it.fulfilled && it.evidenceItemId && cadrage.docs.length > 0 && (
                <div className="mt-1.5 rounded-md bg-forest-50/60 border border-forest-100 px-2 py-1.5">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-forest-700 mb-1">Depuis le cadrage</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cadrage.docs.map((d) => (
                      <button key={d.id} type="button" onClick={() => void useFromCadrage(it, d.id)}
                        title={`Fourni au cadrage (${d.question_code}) — utiliser comme preuve`}
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-forest-700 bg-white border border-forest-200 rounded px-1.5 py-0.5 hover:bg-forest-100 max-w-full">
                        <Paperclip size={9} className="shrink-0" />
                        <span className="truncate max-w-[140px]">{d.file_name}</span>
                        <span className="font-semibold shrink-0">&middot; Utiliser</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
