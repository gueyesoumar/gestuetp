import { useMemo, useState } from 'react'
import { useAssessmentDetail, type VendorAssessment, type AssessmentControl } from './useVendorAssessment'
import { VENDOR_CONFORMITY, conformityScore, verdictOf } from './vendorLabels'
import { QualificationBadge } from './vendorBadges'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

interface Props { assessment: VendorAssessment; onClosed: () => void }

/** Grille de cotation d'une evaluation fournisseur : score live + verdict + cloture. */
export function VendorAssessmentPanel({ assessment, onClosed }: Props): JSX.Element {
  const { controls, loading, setLevel, close } = useAssessmentDetail(assessment.id)
  const [months, setMonths] = useState(12)
  const [busy, setBusy] = useState(false)
  const closed = assessment.status === 'cloturee'

  const byDomain = useMemo(() => {
    const m = new Map<string, AssessmentControl[]>()
    controls.forEach((c) => m.set(c.domain_name, [...(m.get(c.domain_name) ?? []), c]))
    return [...m.entries()]
  }, [controls])
  const liveScore = closed ? assessment.score : conformityScore(controls.map((c) => c.conformity_level))

  const doClose = async (): Promise<void> => {
    setBusy(true)
    const r = await close(months)
    setBusy(false)
    if (r) onClosed()
  }

  if (loading) return <div className="p-6"><LoadingSpinner /></div>

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{assessment.framework_name}</h3>
          <p className="text-[11.5px] text-gray-500">{closed ? `Clôturée le ${assessment.assessed_at}` : 'Évaluation en cours'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[22px] font-bold font-mono text-gray-900">{liveScore ?? '-'}<span className="text-[13px] text-gray-400">/100</span></div>
            {liveScore != null && (closed ? <QualificationBadge status={assessment.verdict ?? ''} /> : <QualificationBadge status={verdictOf(liveScore)} />)}
          </div>
        </div>
      </div>

      <div className="max-h-[52vh] overflow-y-auto">
        {byDomain.map(([domain, list]) => (
          <div key={domain}>
            <div className="px-4 py-2 bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 font-semibold sticky top-0">{domain}</div>
            {list.map((c) => (
              <div key={c.control_id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50">
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[11px] text-gray-400">{c.control_code}</span>
                  <span className="text-[13px] text-gray-800 ml-2">{c.control_name}</span>
                </div>
                {closed ? (
                  <span className="text-[12px] text-gray-500 w-44 text-right">{VENDOR_CONFORMITY.find((o) => o.value === c.conformity_level)?.label ?? '-'}</span>
                ) : (
                  <select value={c.conformity_level ?? ''} onChange={(e) => void setLevel(c.control_id, e.target.value)} className="w-44 px-2 py-1.5 text-[12px] border border-gray-300 rounded-lg">
                    <option value="">A coter</option>
                    {VENDOR_CONFORMITY.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {!closed && (
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-100">
          <label className="text-[12px] text-gray-500">Validité
            <input type="number" min={1} max={60} value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-16 ml-2 px-2 py-1 text-[12px] border border-gray-300 rounded-lg" /> mois
          </label>
          <button onClick={() => void doClose()} disabled={busy || liveScore == null} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-forest-700 hover:bg-forest-900 disabled:opacity-50">
            {busy ? 'En cours...' : 'Clôturer et qualifier'}
          </button>
        </div>
      )}
    </div>
  )
}
