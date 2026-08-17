import { useEffect, useState } from 'react'
import { X, ArrowRight, Shield, FileText, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  SCORE_DIMENSION_COLORS, RISK_CONTROL_LINK_KINDS,
  splitBarrierEfficacies, riskResidualSplit, riskExposure, incidentLikelihoodBump,
  type ScoreDimensionKey, type RiskControlLinkKind,
} from '../../lib/constants'
import type { RiskCatalogEntry } from '../../types/database.types'

export interface AuditedScenario {
  id: string; title: string; dimension: string | null
  inherent_likelihood: number; inherent_impact: number
  threat_ref: string | null; feared_event_ref: string | null
  vulnerability: string | null; asset_name: string | null
}
interface BowtieData {
  barriers: { code: string; name: string; kind: string; effectiveness: number }[]
  policyBarriers: { title: string; kind: string; effectiveness: number }[]
  incidents: { id: string; category: string; severity: string }[]
  linkedIncidentIds: string[]
  scenarioIncidentIds: string[]
}

const kindLabel = (k: string): string => RISK_CONTROL_LINK_KINDS.find((x) => x.value === k)?.label ?? k
const pct = (v: number): number => Math.round(v * 100)
const expColor = (v: number): string => v >= 60 ? '#C0392B' : v >= 30 ? '#B8860B' : '#27AE60'
const SEV_COLOR: Record<string, string> = { critique: '#C0392B', eleve: '#B8860B', moyen: '#3B82F6', faible: '#6B7280' }

/** Nœud papillon LECTURE SEULE du scénario de l'audité (cross-tenant via RPC). */
export function AuditedScenarioBowtie({ scenario, catalog, onClose }: { scenario: AuditedScenario; catalog: RiskCatalogEntry[]; onClose: () => void }): JSX.Element {
  const [data, setData] = useState<BowtieData | null>(null)

  useEffect(() => {
    const ac = new AbortController()
    supabase.rpc('get_audited_scenario_bowtie', { p_scenario_id: scenario.id }).abortSignal(ac.signal)
      .then(({ data: d, error }) => {
        if (ac.signal.aborted) return
        if (error) { console.error('[audited bowtie]', error.message); return }
        setData(d as unknown as BowtieData)
      })
    return () => ac.abort()
  }, [scenario.id])

  const label = (id: string | null): string => id ? (catalog.find((c) => c.id === id)?.label ?? 'Non précisé') : 'Non précisé'
  const dim = scenario.dimension as ScoreDimensionKey | null
  const dimColor = dim ? SCORE_DIMENSION_COLORS[dim] : '#94A3B8'
  const incidents = data?.incidents ?? []
  const bump = dim ? incidentLikelihoodBump(dim, new Set(data?.scenarioIncidentIds ?? []), incidents, new Set(data?.linkedIncidentIds ?? [])) : 0
  const effL = Math.min(4, scenario.inherent_likelihood + bump)
  const inherentExp = riskExposure(effL, scenario.inherent_impact)
  const allBarriers = [
    ...(data?.barriers ?? []).map((b) => ({ kind: b.kind as RiskControlLinkKind, effectiveness: b.effectiveness })),
    ...(data?.policyBarriers ?? []).map((b) => ({ kind: b.kind as RiskControlLinkKind, effectiveness: b.effectiveness })),
  ]
  const hasBarriers = allBarriers.length > 0
  const { effPrev, effCorr } = splitBarrierEfficacies(allBarriers)
  const residual = hasBarriers ? riskResidualSplit(effL, scenario.inherent_impact, effPrev, effCorr) : inherentExp

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">{scenario.title}</h3>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Registre de l&apos;assujetti · lecture seule</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="px-5 py-5 grid grid-cols-[1fr_auto_1.2fr_auto_1fr] gap-3 items-center">
          <Card title="Menace" tone="red" main={label(scenario.threat_ref)} />
          <ArrowRight size={18} className="text-gray-300 mx-auto" />
          <div className="rounded-xl border-2 p-3 text-center" style={{ borderColor: dimColor }}>
            <div className="text-[13px] font-bold text-gray-900">{scenario.title}</div>
            {scenario.asset_name && <div className="text-[11px] text-gray-500 mt-0.5">Actif&nbsp;: {scenario.asset_name}</div>}
            {scenario.vulnerability && <div className="text-[11px] text-gray-400 mt-0.5 italic">« {scenario.vulnerability} »</div>}
            <div className="mt-2 text-[10px] font-mono text-gray-400">V{scenario.inherent_likelihood}{bump > 0 && <b style={{ color: '#C0392B' }}>+{bump}</b>}·I{scenario.inherent_impact}</div>
            <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[10px] font-mono">
              <span className="text-gray-400">inhérent <b style={{ color: expColor(inherentExp) }}>{inherentExp}</b></span>
              {hasBarriers && <span className="text-gray-300">→</span>}
              {hasBarriers && <span className="text-gray-400">résiduel <b style={{ color: expColor(residual) }}>{residual}</b></span>}
            </div>
            {hasBarriers && (
              <div className="mt-1 text-[9.5px] text-forest-700">préventif <b>{effPrev == null ? '—' : `${pct(effPrev)}%`}</b> · correctif <b>{effCorr == null ? '—' : `${pct(effCorr)}%`}</b></div>
            )}
          </div>
          <ArrowRight size={18} className="text-gray-300 mx-auto" />
          <Card title="Événement redouté" tone="amber" main={label(scenario.feared_event_ref)} />
        </div>

        <Section icon={<Shield size={14} className="text-forest-700" />} title="Barrières · contrôles">
          {(data?.barriers ?? []).length === 0 ? <Empty /> : (data?.barriers ?? []).map((b, i) => (
            <Chip key={i} label={<><span className="font-mono font-semibold text-forest-800">{b.code}</span> · {kindLabel(b.kind)}</>} value={`${pct(b.effectiveness)}%`} color={expColor(100 - pct(b.effectiveness))} />
          ))}
        </Section>
        <Section icon={<FileText size={14} className="text-[#6D5AE6]" />} title="Barrières · politiques">
          {(data?.policyBarriers ?? []).length === 0 ? <Empty /> : (data?.policyBarriers ?? []).map((b, i) => (
            <Chip key={i} label={<><span className="text-gray-700">{b.title}</span> · {kindLabel(b.kind)}</>} value={`${pct(b.effectiveness)}%`} color={expColor(100 - pct(b.effectiveness))} />
          ))}
        </Section>
        <Section icon={<AlertTriangle size={14} className="text-[#C0392B]" />} title="Incidents (aggravation)" last>
          {incidents.length === 0 ? <Empty msg="Aucun incident récent." /> : incidents.map((i) => (
            <Chip key={i.id} label={<><span className="w-1.5 h-1.5 rounded-full inline-block mr-1.5" style={{ background: SEV_COLOR[i.severity] ?? '#6B7280' }} />{i.category}</>} value={i.severity} color="#6B7280" />
          ))}
        </Section>
      </div>
    </div>
  )
}

function Card({ title, main, tone }: { title: string; main: string; tone: 'red' | 'amber' }): JSX.Element {
  const c = tone === 'red' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-700'
  return (
    <div className={`rounded-xl border p-3 text-center ${c.split(' ').slice(0, 2).join(' ')}`}>
      <div className={`text-[10px] font-mono uppercase tracking-wide ${c.split(' ')[2]}`}>{title}</div>
      <div className="text-[12.5px] font-semibold text-gray-800 mt-1">{main}</div>
    </div>
  )
}
function Section({ icon, title, last, children }: { icon: JSX.Element; title: string; last?: boolean; children: React.ReactNode }): JSX.Element {
  return (
    <div className={`px-5 py-3 border-t border-gray-100 ${last ? 'pb-5' : ''}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<h4 className="text-[12px] font-bold uppercase tracking-wide text-gray-500">{title}</h4></div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
function Chip({ label, value, color }: { label: React.ReactNode; value: string; color: string }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px]">
      {label}<span className="font-semibold" style={{ color }}>{value}</span>
    </span>
  )
}
function Empty({ msg }: { msg?: string }): JSX.Element {
  return <span className="text-[12px] text-gray-400">{msg ?? 'Aucune barrière.'}</span>
}
