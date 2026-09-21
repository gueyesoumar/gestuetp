export interface ImpactReport {
  verdict: 'go' | 'a_etudier' | 'no_go'
  summary: string
  blast_radius: string[]
  migrations?: { needed?: boolean; note?: string }
  rls_impact?: { verdict?: 'ok' | 'attention' | 'bloquant'; note?: string }
  backend?: { edges?: string[]; gate_prod?: boolean; note?: string }
  frontend?: { note?: string }
  tests: string[]
  decoupage_lots: string[]
  securite?: { verdict?: 'ok' | 'attention' | 'bloquant'; note?: string }
  risks: string[]
  specialists: Array<{ axis: string; verdict: 'ok' | 'attention' | 'bloquant'; note: string }>
}

const VERDICT: Record<string, { label: string; cls: string }> = {
  go: { label: 'Go', cls: 'bg-forest-100 text-forest-800 border-forest-200' },
  a_etudier: { label: 'À étudier', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  no_go: { label: 'No-go', cls: 'bg-red-50 text-red-700 border-red-200' },
}

const DOT: Record<string, string> = { ok: 'bg-forest-500', attention: 'bg-amber-500', bloquant: 'bg-red-500' }

/** Rendu pur d'un rapport d'impact (RFC 0010, Phase 5a). Tolère un rapport partiel. */
export function ImpactReportView({ report }: { report: ImpactReport }): JSX.Element {
  const v = VERDICT[report.verdict] ?? VERDICT.a_etudier
  const specialists = report.specialists ?? []
  const blast = report.blast_radius ?? []
  return (
    <div className="mt-3 space-y-3 text-[13px]">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${v.cls}`}>{v.label}</span>
        {report.migrations?.needed && <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Migration requise</span>}
        {report.backend?.gate_prod && <span className="text-[11px] text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">Gate prod</span>}
      </div>
      <p className="text-gray-700">{report.summary}</p>

      {specialists.length > 0 && (
        <div className="space-y-1.5">
          {specialists.map((s) => (
            <div key={s.axis} className="flex gap-2">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${DOT[s.verdict] ?? 'bg-gray-400'}`} />
              <p><span className="font-semibold text-gray-700">{s.axis}&nbsp;:</span> <span className="text-gray-600">{s.note}</span></p>
            </div>
          ))}
        </div>
      )}

      <KeyRow label="Migrations" verdict={report.migrations?.needed ? 'attention' : 'ok'} note={report.migrations?.note} />
      <KeyRow label="RLS / multi-tenant" verdict={report.rls_impact?.verdict} note={report.rls_impact?.note} />
      <KeyRow label="Backend" note={report.backend?.note} />
      <KeyRow label="Sécurité" verdict={report.securite?.verdict} note={report.securite?.note} />

      {blast.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {blast.map((a) => (
            <span key={a} className="font-mono text-[10.5px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{a}</span>
          ))}
        </div>
      )}

      <ReportList title="Découpage en lots" items={report.decoupage_lots} ordered />
      <ReportList title="Plan de test" items={report.tests} />
      <ReportList title="Risques" items={report.risks} />
    </div>
  )
}

function KeyRow({ label, verdict, note }: { label: string; verdict?: string; note?: string }): JSX.Element | null {
  if (!note) return null
  return (
    <div className="flex gap-2">
      {verdict && <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${DOT[verdict] ?? 'bg-gray-400'}`} />}
      <p><span className="font-semibold text-gray-700">{label}&nbsp;:</span> <span className="text-gray-600">{note}</span></p>
    </div>
  )
}

function ReportList({ title, items, ordered }: { title: string; items: string[]; ordered?: boolean }): JSX.Element | null {
  if (!items || items.length === 0) return null
  const cls = 'list-inside space-y-0.5 text-gray-600 ' + (ordered ? 'list-decimal' : 'list-disc')
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">{title}</p>
      <ul className={cls}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  )
}
