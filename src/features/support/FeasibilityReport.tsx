export interface FeasibilityReport {
  verdict: 'go' | 'a_etudier' | 'no_go'
  summary: string
  rice: { reach: number; impact: number; confidence: number; effort: number; score: number }
  effort_estimate: string
  dimensions: Array<{ axis: string; verdict: 'ok' | 'attention' | 'bloquant'; note: string }>
  touched_areas: string[]
  hypotheses: string[]
  risks: string[]
}

const VERDICT: Record<string, { label: string; cls: string }> = {
  go: { label: 'Go', cls: 'bg-forest-100 text-forest-800 border-forest-200' },
  a_etudier: { label: 'À étudier', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  no_go: { label: 'No-go', cls: 'bg-red-50 text-red-700 border-red-200' },
}

const DIM_DOT: Record<string, string> = { ok: 'bg-forest-500', attention: 'bg-amber-500', bloquant: 'bg-red-500' }

/** Rendu pur d'un rapport de faisabilite RICE (aucune logique). */
export function FeasibilityReportView({ report }: { report: FeasibilityReport }): JSX.Element {
  const v = VERDICT[report.verdict] ?? VERDICT.a_etudier
  // Defense en profondeur : le CI valide deja le schema avant write-back, mais on
  // tolere un rapport partiel (drift futur) plutot que de planter la superadmin.
  const rice = report.rice ?? { reach: 0, impact: 0, confidence: 0, effort: 0, score: 0 }
  const dimensions = report.dimensions ?? []
  const touchedAreas = report.touched_areas ?? []
  return (
    <div className="mt-3 space-y-3 text-[13px]">
      <div className="flex items-center gap-2">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${v.cls}`}>{v.label}</span>
        <span className="text-xs text-gray-500">Effort&nbsp;: {report.effort_estimate}</span>
        <span className="text-xs text-gray-500">&middot; RICE&nbsp;: <strong>{rice.score}</strong></span>
      </div>
      <p className="text-gray-700">{report.summary}</p>

      <div className="grid grid-cols-4 gap-2 text-center">
        {[['Reach', rice.reach], ['Impact', rice.impact], ['Confiance', rice.confidence], ['Effort', rice.effort]].map(([k, val]) => (
          <div key={String(k)} className="bg-white border border-gray-100 rounded-lg py-1.5">
            <div className="text-[10px] uppercase text-gray-400">{k}</div>
            <div className="text-sm font-semibold text-gray-800">{val}</div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        {dimensions.map((d) => (
          <div key={d.axis} className="flex gap-2">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${DIM_DOT[d.verdict] ?? 'bg-gray-400'}`} />
            <p><span className="font-semibold text-gray-700">{d.axis}&nbsp;:</span> <span className="text-gray-600">{d.note}</span></p>
          </div>
        ))}
      </div>

      {touchedAreas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {touchedAreas.map((a) => (
            <span key={a} className="font-mono text-[10.5px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{a}</span>
          ))}
        </div>
      )}

      <ReportList title="Hypothèses" items={report.hypotheses} />
      <ReportList title="Risques" items={report.risks} />
    </div>
  )
}

function ReportList({ title, items }: { title: string; items: string[] }): JSX.Element | null {
  if (!items || items.length === 0) return null
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">{title}</p>
      <ul className="list-disc list-inside space-y-0.5 text-gray-600">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  )
}
