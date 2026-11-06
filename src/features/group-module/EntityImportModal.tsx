import { useMemo, useRef, useState } from 'react'
import { X, Download, Upload, CheckCircle2, AlertTriangle, Copy } from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import { useSectors } from '../../hooks/useSectors'
import { useManageEntity } from './useManageEntity'
import { downloadEntityTemplate, parseEntitiesFile, type ParsedEntityRow } from './entityImportTemplate'
import { findSimilar } from './fuzzyMatch'

interface Props {
  isRegul: boolean
  entityLabel: string
  existingNames: string[]
  onClose: () => void
  onImported: () => void
}

type DecoratedRow = ParsedEntityRow & { dup: string | null }

/** Import en masse d'entités / assujettis : modèle XLSX, aperçu, import (succès partiel). */
export function EntityImportModal({ isRegul, entityLabel, existingNames, onClose, onImported }: Props): JSX.Element {
  const toast = useToast()
  const { sectors } = useSectors()
  const { createEntitiesBulk, busy } = useManageEntity()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedEntityRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [includeDuplicates, setIncludeDuplicates] = useState(false)
  const [done, setDone] = useState<{ created: number; failed: number; errors: string[] } | null>(null)

  const sheet = `${entityLabel}`.slice(0, 28) || 'Entites'

  // Décoration : doublon probable vs registre existant, puis vs lignes déjà vues du fichier.
  const decorated: DecoratedRow[] = useMemo(() => {
    if (!rows) return []
    const seen: string[] = []
    return rows.map((r) => {
      if (!r.data) return { ...r, dup: null }
      const hit = findSimilar(r.name, existingNames)
      const inFile = hit ? null : findSimilar(r.name, seen)
      seen.push(r.name)
      return { ...r, dup: hit ? hit.name : inFile ? `${inFile.name} (dans le fichier)` : null }
    })
  }, [rows, existingNames])

  const ready = decorated.filter((d) => d.data && !d.dup)
  const dups = decorated.filter((d) => d.data && d.dup)
  const invalid = decorated.filter((d) => !d.data)
  const importList = includeDuplicates ? [...ready, ...dups] : ready

  const onTemplate = (): void => {
    void downloadEntityTemplate({ isRegul, sectorLabels: sectors.map((s) => s.label), sheetName: sheet, filename: `modele-${sheet.toLowerCase().replace(/\s+/g, '-')}.xlsx` })
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name); setDone(null)
    try {
      const parsed = await parseEntitiesFile(f, { isRegul, sectorLabels: sectors.map((s) => s.label) })
      if (parsed.length === 0) { toast.error('Aucune ligne trouvée dans le fichier'); setRows(null); return }
      setRows(parsed)
    } catch {
      toast.error('Fichier illisible. Utilisez le modèle fourni (.xlsx).'); setRows(null)
    }
  }

  const onImport = async (): Promise<void> => {
    if (importList.length === 0) return
    const res = await createEntitiesBulk(importList.map((r) => r.data!))
    if (!res.ok) { toast.error(res.error ?? 'Import impossible'); return }
    const errs = res.results.filter((r) => !r.ok).map((r) => `${r.name} : ${r.error ?? 'erreur'}`)
    setDone({ created: res.created, failed: res.failed, errors: errs })
    if (res.created > 0) { toast.success(`${res.created} ligne(s) importée(s)`); onImported() }
    setRows(null)
  }

  const field = 'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Importer en masse</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <ol className="text-[13px] text-gray-600 space-y-1 list-decimal list-inside">
            <li>Téléchargez le modèle, puis remplissez une ligne par entrée.</li>
            <li>Rechargez le fichier : un aperçu valide vos données avant import.</li>
          </ol>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={onTemplate} className={`${field} text-forest-700 border border-forest-200 hover:bg-forest-50`}><Download size={15} /> Télécharger le modèle</button>
            <button onClick={() => fileRef.current?.click()} className={`${field} text-white bg-forest-700 hover:bg-forest-900`}><Upload size={15} /> Choisir un fichier</button>
            <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => void onFile(e)} />
            {fileName && <span className="text-[12px] text-gray-500 truncate">{fileName}</span>}
          </div>

          {done && (
            <div className="rounded-lg border border-gray-200 p-3 space-y-2">
              <p className="text-[13px] font-semibold text-gray-800 inline-flex items-center gap-1.5"><CheckCircle2 size={16} className="text-forest-700" /> {done.created} créé(s){done.failed > 0 ? `, ${done.failed} en erreur` : ''}</p>
              {done.errors.length > 0 && <ul className="text-[12px] text-red-700 space-y-0.5 max-h-40 overflow-y-auto">{done.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
            </div>
          )}

          {rows && (
            <>
              <div className="flex items-center gap-3 text-[13px] flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-forest-700 font-semibold"><CheckCircle2 size={15} /> {ready.length} prêt(s)</span>
                {dups.length > 0 && <span className="inline-flex items-center gap-1.5 text-amber-600 font-semibold"><Copy size={15} /> {dups.length} doublon(s) probable(s)</span>}
                {invalid.length > 0 && <span className="inline-flex items-center gap-1.5 text-red-600 font-semibold"><AlertTriangle size={15} /> {invalid.length} en erreur</span>}
              </div>
              {dups.length > 0 && (
                <label className="flex items-center gap-2 text-[12.5px] text-gray-600">
                  <input type="checkbox" checked={includeDuplicates} onChange={(e) => setIncludeDuplicates(e.target.checked)} />
                  Importer aussi les doublons probables
                </label>
              )}
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500 sticky top-0">
                    <tr><th className="px-3 py-2 font-semibold">Ligne</th><th className="px-3 py-2 font-semibold">Nom</th><th className="px-3 py-2 font-semibold">Statut</th></tr>
                  </thead>
                  <tbody>
                    {decorated.map((r) => (
                      <tr key={r.rowNumber} className="border-t border-gray-100">
                        <td className="px-3 py-1.5 text-gray-400">{r.rowNumber}</td>
                        <td className="px-3 py-1.5 text-gray-800">{r.name}</td>
                        <td className="px-3 py-1.5">{!r.data
                          ? <span className="text-red-600">{r.errors.join(' · ')}</span>
                          : r.dup
                            ? <span className="text-amber-600">Doublon probable : {r.dup}</span>
                            : <span className="text-forest-700">Prêt</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Fermer</button>
          <button onClick={() => void onImport()} disabled={busy || importList.length === 0} className="px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
            {busy ? 'Import...' : `Importer ${importList.length} ligne(s)`}
          </button>
        </div>
      </div>
    </div>
  )
}
