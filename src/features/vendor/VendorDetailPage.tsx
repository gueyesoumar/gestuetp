import { useState } from 'react'
import { ChevronLeft, Plus } from 'lucide-react'
import { useVendorAssessments, type VendorAssessment } from './useVendorAssessment'
import { VendorAssessmentPanel } from './VendorAssessmentPanel'
import { QualificationBadge } from './vendorBadges'
import type { VendorListItem } from './useVendors'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

/** Fiche fournisseur : evaluations securite + verdict de qualification (RFC 0020 Lot 2). */
export function VendorDetailPage({ vendor, onBack }: { vendor: VendorListItem; onBack: () => void }): JSX.Element {
  const { rows, frameworks, loading, create, reload } = useVendorAssessments(vendor.relationship_id)
  const [open, setOpen] = useState<VendorAssessment | null>(null)
  const [fw, setFw] = useState('')
  const [creating, setCreating] = useState(false)

  const startNew = async (): Promise<void> => {
    if (!fw) return
    setCreating(true)
    await create(fw)
    setCreating(false)
    setFw('')
    await reload()
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-[12px] text-forest-700 font-semibold hover:text-forest-900 inline-flex items-center gap-1"><ChevronLeft size={14} /> Retour au registre</button>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-gray-900">{vendor.name}</h1>
        <QualificationBadge status={vendor.qualification_status} />
        {vendor.sector && <span className="text-[12px] text-gray-400">{vendor.sector}</span>}
      </div>

      {open ? (
        <div className="space-y-3">
          <button onClick={() => { setOpen(null); void reload() }} className="text-[12px] text-forest-700 font-semibold hover:text-forest-900">← Toutes les évaluations</button>
          <VendorAssessmentPanel assessment={open} onClosed={() => { setOpen(null); void reload() }} />
        </div>
      ) : (
        <>
          <div className="flex items-end gap-2 flex-wrap rounded-xl border border-gray-200 bg-white p-4">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Référentiel d&apos;évaluation</label>
              <select value={fw} onChange={(e) => setFw(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg min-w-[220px]">
                <option value="">Choisir un référentiel...</option>
                {frameworks.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <button onClick={() => void startNew()} disabled={!fw || creating} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50"><Plus size={16} /> Nouvelle évaluation</button>
          </div>

          {loading ? <LoadingSpinner /> : rows.length === 0 ? (
            <p className="text-[13px] text-gray-400 px-1">Aucune évaluation. Choisissez un référentiel pour démarrer.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-[13px]">
                <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
                  <tr><th className="text-left px-4 py-3 font-semibold">Référentiel</th><th className="text-left px-4 py-3 font-semibold">Statut</th><th className="text-right px-4 py-3 font-semibold">Score</th><th className="text-left px-4 py-3 font-semibold">Verdict</th><th className="text-left px-4 py-3 font-semibold">Validité</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setOpen(a)}>
                      <td className="px-4 py-3 font-medium text-gray-900">{a.framework_name}</td>
                      <td className="px-4 py-3 text-gray-500">{a.status === 'cloturee' ? 'Clôturée' : 'En cours'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{a.score ?? '-'}</td>
                      <td className="px-4 py-3">{a.verdict ? <QualificationBadge status={a.verdict} /> : <span className="text-gray-400">-</span>}</td>
                      <td className="px-4 py-3 text-gray-500">{a.valid_until ? new Date(a.valid_until).toLocaleDateString('fr-FR') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
