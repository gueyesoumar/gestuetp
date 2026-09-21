import { Database, ShieldCheck, Server, ListChecks, FlaskConical, AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'

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
  go: { label: 'Go', cls: 'bg-forest-700 text-white' },
  a_etudier: { label: 'À étudier', cls: 'bg-amber-500 text-white' },
  no_go: { label: 'No-go', cls: 'bg-red-600 text-white' },
}
const DOT: Record<string, string> = { ok: 'bg-emerald-500', attention: 'bg-amber-500', bloquant: 'bg-red-500' }

/** Rendu du rapport d'impact (RFC 0010, Phase 5a). Tolère un rapport partiel. */
export function ImpactReportView({ report }: { report: ImpactReport }): JSX.Element {
  const v = VERDICT[report.verdict] ?? VERDICT.a_etudier
  const specialists = report.specialists ?? []
  const blast = report.blast_radius ?? []
  const keys = [
    { icon: Database, label: 'Migrations', verdict: report.migrations?.needed ? 'attention' : 'ok', note: report.migrations?.note },
    { icon: ShieldCheck, label: 'RLS / multi-tenant', verdict: report.rls_impact?.verdict, note: report.rls_impact?.note },
    { icon: ShieldCheck, label: 'Sécurité', verdict: report.securite?.verdict, note: report.securite?.note },
    { icon: Server, label: 'Backend', verdict: undefined, note: report.backend?.note },
  ].filter((k) => k.note)

  return (
    <div className="mt-3 space-y-3.5">
      {/* En-tête */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${v.cls}`}>{v.label}</span>
          {report.migrations?.needed && <Chip cls="bg-amber-50 text-amber-700 border-amber-200">Migration requise</Chip>}
          {report.backend?.gate_prod && <Chip cls="bg-gray-100 text-gray-600 border-gray-200">Gate prod</Chip>}
        </div>
        <p className="text-[13px] text-gray-700 mt-2.5 leading-relaxed">{report.summary}</p>
      </div>

      {/* Facteurs clés */}
      {keys.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {keys.map((k) => {
            const Icon = k.icon
            return (
              <div key={k.label} className="rounded-lg border border-gray-200 bg-white p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={13} className="text-forest-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{k.label}</span>
                  {k.verdict && <span className={`ml-auto w-2 h-2 rounded-full ${DOT[k.verdict] ?? 'bg-gray-300'}`} />}
                </div>
                <p className="text-[12px] text-gray-600 leading-snug">{k.note}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Spécialistes */}
      {specialists.length > 0 && (
        <Block title="Analyse par spécialiste">
          <div className="space-y-2">
            {specialists.map((s) => (
              <div key={s.axis} className="flex gap-2.5">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${DOT[s.verdict] ?? 'bg-gray-300'}`} />
                <p className="text-[12.5px] leading-snug"><span className="font-semibold text-gray-800">{s.axis}</span> <span className="text-gray-600">— {s.note}</span></p>
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* Rayon d'impact */}
      {blast.length > 0 && (
        <Block title="Rayon d'impact">
          <div className="flex flex-wrap gap-1.5">
            {blast.map((a) => <span key={a} className="font-mono text-[10.5px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{a}</span>)}
          </div>
        </Block>
      )}

      {/* Découpage en lots */}
      {report.decoupage_lots?.length > 0 && (
        <Block title="Découpage en lots" icon={<ListChecks size={13} className="text-forest-600" />}>
          <ol className="space-y-1.5">
            {report.decoupage_lots.map((lot, i) => (
              <li key={i} className="flex gap-2.5 items-start">
                <span className="shrink-0 w-5 h-5 rounded-full bg-forest-100 text-forest-700 text-[10px] font-bold grid place-items-center">{i + 1}</span>
                <span className="text-[12.5px] text-gray-700 leading-snug">{lot}</span>
              </li>
            ))}
          </ol>
        </Block>
      )}

      <ItemList title="Plan de test" items={report.tests} icon={<FlaskConical size={13} className="text-forest-600" />} />
      <ItemList title="Risques" items={report.risks} icon={<AlertTriangle size={13} className="text-amber-600" />} />
    </div>
  )
}

function Chip({ cls, children }: { cls: string; children: ReactNode }): JSX.Element {
  return <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{children}</span>
}

function Block({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }): JSX.Element {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3.5">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{title}</span>
      </div>
      {children}
    </div>
  )
}

function ItemList({ title, items, icon }: { title: string; items: string[]; icon?: ReactNode }): JSX.Element | null {
  if (!items || items.length === 0) return null
  return (
    <Block title={title} icon={icon}>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 items-start text-[12.5px] text-gray-600 leading-snug">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />{it}
          </li>
        ))}
      </ul>
    </Block>
  )
}
