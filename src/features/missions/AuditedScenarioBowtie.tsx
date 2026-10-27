import { useEffect, useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  SCORE_DIMENSION_COLORS, SCORE_DIMENSION_LABELS, RISK_LIFECYCLE_STATUS,
  splitBarrierEfficacies, riskResidualSplit, riskExposure, incidentLikelihoodBump,
  type ScoreDimensionKey, type RiskControlLinkKind,
} from '../../lib/constants'
import { SourceBadge } from '../risk/riskLabels'
import { Arm, Node, pct, expColor, type Barrier } from './AuditedBowtieParts'
import type { RiskCatalogEntry } from '../../types/database.types'

export interface AuditedScenario {
  id: string; title: string; dimension: string | null
  inherent_likelihood: number; inherent_impact: number
  threat_ref: string | null; feared_event_ref: string | null
  vulnerability: string | null; asset_name: string | null
  lifecycle_status: string; source: string
}
interface BowtieData {
  barriers: { code: string; name: string; kind: string; effectiveness: number }[]
  policyBarriers: { title: string; kind: string; effectiveness: number }[]
  incidents: { id: string; category: string; severity: string }[]
  linkedIncidentIds: string[]; scenarioIncidentIds: string[]
}

const lifecycleLabel = (v: string): string => RISK_LIFECYCLE_STATUS.find((s) => s.value === v)?.label ?? v
const SEV_COLOR: Record<string, string> = { critique: '#C0392B', eleve: '#B8860B', moyen: '#3B82F6', faible: '#6B7280' }

/** Nœud papillon LECTURE SEULE du scénario de l'audité : barre d'exposition + bras
 *  préventif/correctif + incidents (cross-tenant via RPC). */
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
  const all: Barrier[] = [
    ...(data?.barriers ?? []).map((b) => ({ label: b.code, kind: b.kind, effectiveness: b.effectiveness, type: 'control' as const })),
    ...(data?.policyBarriers ?? []).map((b) => ({ label: b.title, kind: b.kind, effectiveness: b.effectiveness, type: 'policy' as const })),
  ]
  const hasBarriers = all.length > 0
  const { effPrev, effCorr } = splitBarrierEfficacies(all.map((b) => ({ kind: b.kind as RiskControlLinkKind, effectiveness: b.effectiveness })))
  const residual = hasBarriers ? riskResidualSplit(effL, scenario.inherent_impact, effPrev, effCorr) : inherentExp
  const leftB = all.filter((b) => b.kind === 'preventive')
  const rightB = all.filter((b) => b.kind !== 'preventive')

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <div className="text-[10px] text-gray-400 uppercase tracking-wide">Registre de l&apos;assujetti · lecture seule</div>
            <h3 className="font-semibold text-gray-900 mt-0.5">{scenario.title}</h3>
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              {dim && <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: `${dimColor}22`, color: dimColor }}>{SCORE_DIMENSION_LABELS[dim]}</span>}
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-forest-50 text-forest-700 border border-forest-100">{lifecycleLabel(scenario.lifecycle_status)}</span>
              <SourceBadge source={scenario.source} />
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0"><X size={18} /></button>
        </div>

        {/* Barre d'exposition inhérente (reprise de la proposition A) */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-5 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-400">Exposition inhérente</div>
            <div className="font-mono font-bold text-[32px] leading-none" style={{ color: expColor(inherentExp) }}>{inherentExp}<span className="text-[14px] text-gray-400">/100</span></div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="relative h-2.5 rounded-full" style={{ background: 'linear-gradient(90deg,#27AE60 0 30%,#B8860B 30% 60%,#C0392B 60% 100%)' }}>
              <span className="absolute -top-1 w-0.5 h-[18px] bg-gray-900 rounded" style={{ left: `${inherentExp}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-semibold mt-1.5"><span>Maîtrisé</span><span>Critique</span></div>
            <div className="text-[11.5px] text-gray-500 mt-1.5">
              Vraisemblance <b className="font-mono">{scenario.inherent_likelihood}/4</b>{bump > 0 && <b className="font-mono" style={{ color: '#C0392B' }}>+{bump}</b>} · Impact <b className="font-mono">{scenario.inherent_impact}/4</b> · {hasBarriers
                ? <>Résiduel <b style={{ color: expColor(residual) }}>{residual}</b> (préventif {effPrev == null ? '-' : `${pct(effPrev)}%`} · correctif {effCorr == null ? '-' : `${pct(effCorr)}%`})</>
                : <span style={{ color: '#B8860B', fontWeight: 600 }}>Résiduel = inhérent · aucune barrière</span>}
            </div>
          </div>
        </div>

        {/* Nœud papillon (proposition B) */}
        <div className="grid grid-cols-1 sm:grid-cols-3">
          <Arm cap="Menace" capColor="#C0392B" node={<Node tone="red" text={label(scenario.threat_ref)} />} barriersCap="Barrières préventives" barriers={leftB} />
          <div className="flex flex-col items-center justify-center text-center p-4 border-t sm:border-t-0 sm:border-x border-gray-100">
            <div className="rounded-xl border-2 px-3 py-3 w-full" style={{ borderColor: dimColor }}>
              <div className="text-[12.5px] font-bold text-gray-900 leading-snug">{scenario.title}</div>
              {scenario.asset_name && <div className="text-[11px] text-gray-500 mt-1">Actif : {scenario.asset_name}</div>}
              {scenario.vulnerability && <div className="text-[11px] text-gray-400 mt-0.5 italic">« {scenario.vulnerability} »</div>}
              <div className="mt-2 text-[10px] font-mono text-gray-400">V{scenario.inherent_likelihood}{bump > 0 && <b style={{ color: '#C0392B' }}>+{bump}</b>} · I{scenario.inherent_impact}</div>
            </div>
          </div>
          <Arm cap="Événement redouté" capColor="#8a6d16" node={<Node tone="amber" text={label(scenario.feared_event_ref)} />} barriersCap="Barrières correctives" barriers={rightB} />
        </div>

        <div className="px-5 py-3 border-t border-gray-100 pb-5">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={14} className="text-[#C0392B]" /><h4 className="text-[12px] font-bold uppercase tracking-wide text-gray-500">Incidents (aggravation)</h4></div>
          <div className="flex flex-wrap gap-2">
            {incidents.length === 0 ? <span className="text-[12px] text-gray-400">Aucun incident récent.</span> : incidents.map((i) => (
              <span key={i.id} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: SEV_COLOR[i.severity] ?? '#6B7280' }} />{i.category}<span className="font-semibold text-gray-500">{i.severity}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

