import { useMemo, useState } from 'react'
import { ClipboardCheck, ChevronLeft } from 'lucide-react'
import { useMySelfAssessments, useMySelfAssessmentDetail } from '../../vendor/useMyVendorSelfAssessment'
import { VENDOR_CONFORMITY } from '../../vendor/vendorLabels'
import { VendorEvidenceCell } from '../../vendor/VendorEvidenceCell'
import { useVendorEvidence } from '../../vendor/useVendorEvidence'
import type { AssessmentControl } from '../../vendor/useVendorAssessment'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'

/** Portail candidat : auto-evaluation securite (RFC 0020 Lot 3a). */
export function ClientVendorAssessmentsPage(): JSX.Element {
  const { rows, loading, reload } = useMySelfAssessments()
  const [openId, setOpenId] = useState<string | null>(null)

  if (loading) return <LoadingSpinner />
  if (openId) return <FillPanel assessmentId={openId} onBack={() => { setOpenId(null); void reload() }} />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><ClipboardCheck size={20} className="text-[#475569]" /> Évaluations sécurité</h1>
        <p className="mt-1 text-[13px] text-gray-500">Complétez votre auto-évaluation. Elle sera revue par l&apos;autorité.</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-gray-400">Aucune évaluation à compléter pour le moment.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
              <tr><th className="text-left px-4 py-3 font-semibold">Référentiel</th><th className="text-left px-4 py-3 font-semibold">Statut</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setOpenId(a.id)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{a.framework_name}</td>
                  <td className="px-4 py-3 text-gray-500">{a.status === 'self_assessment' ? 'À compléter' : a.status === 'soumise' ? 'Soumise' : 'Clôturée'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FillPanel({ assessmentId, onBack }: { assessmentId: string; onBack: () => void }): JSX.Element {
  const { controls, status, loading, setLevel, submit } = useMySelfAssessmentDetail(assessmentId)
  const ev = useVendorEvidence(assessmentId)
  const [busy, setBusy] = useState(false)
  const editable = status === 'self_assessment'
  const byDomain = useMemo(() => {
    const m = new Map<string, AssessmentControl[]>()
    controls.forEach((c) => m.set(c.domain_name, [...(m.get(c.domain_name) ?? []), c]))
    return [...m.entries()]
  }, [controls])
  const done = controls.filter((c) => c.conformity_level).length

  const doSubmit = async (): Promise<void> => { setBusy(true); const ok = await submit(); setBusy(false); if (ok) onBack() }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-[12px] text-forest-700 font-semibold hover:text-forest-900 inline-flex items-center gap-1"><ChevronLeft size={14} /> Retour</button>
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Auto-évaluation</h2>
          <span className="text-[12px] text-gray-500">{done}/{controls.length} cotés</span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {byDomain.map(([domain, list]) => (
            <div key={domain}>
              <div className="px-4 py-2 bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{domain}</div>
              {list.map((c) => (
                <div key={c.control_id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50">
                  <div className="min-w-0 flex-1"><span className="font-mono text-[11px] text-gray-400">{c.control_code}</span><span className="text-[13px] text-gray-800 ml-2">{c.control_name}</span></div>
                  <VendorEvidenceCell files={ev.byControl.get(c.control_id) ?? []} editable={editable} onUpload={(f) => void ev.upload(c.control_id, f)} onOpen={(e) => void ev.openFile(e)} onRemove={(e) => void ev.remove(e)} />
                  {editable ? (
                    <select value={c.conformity_level ?? ''} onChange={(e) => void setLevel(c.control_id, e.target.value)} className="w-44 px-2 py-1.5 text-[12px] border border-gray-300 rounded-lg">
                      <option value="">A coter</option>
                      {VENDOR_CONFORMITY.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <span className="text-[12px] text-gray-500 w-44 text-right">{VENDOR_CONFORMITY.find((o) => o.value === c.conformity_level)?.label ?? '-'}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        {editable && (
          <div className="flex justify-end px-4 py-3 border-t border-gray-100">
            <button onClick={() => void doSubmit()} disabled={busy} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-forest-700 hover:bg-forest-900 disabled:opacity-50">{busy ? 'En cours...' : 'Soumettre à l’autorité'}</button>
          </div>
        )}
      </div>
    </div>
  )
}
