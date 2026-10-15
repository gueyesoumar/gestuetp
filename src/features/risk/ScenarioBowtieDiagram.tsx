import { ShieldCheck, ShieldX } from 'lucide-react'
import { SCORE_DIMENSION_COLORS, barrierSide } from '../../lib/constants'
import type { BowtieModel } from './scenarioBowtieModel'
import type { BarrierControl } from './useScenarioControls'
import type { PolicyBarrier } from '../policy/useScenarioPolicies'
import type { RiskCatalogEntry } from '../../types/database.types'
import type { ScenarioRow } from './useRiskRegister'

const pct = (v: number): number => Math.round(v * 100)
const expColor = (v: number): string => v >= 60 ? '#C0392B' : v >= 30 ? '#B8860B' : '#27AE60'

interface DiagBarrier { key: string; label: string; eff: number | null; weak: boolean }

const toDiag = (barriers: BarrierControl[], pols: PolicyBarrier[], side: 'likelihood' | 'impact'): DiagBarrier[] => [
  ...barriers.filter((b) => barrierSide(b.kind) === side).map((b) => ({ key: b.linkId, label: b.code, eff: b.assessed ? b.effectiveness : null, weak: !b.assessed })),
  ...pols.filter((b) => barrierSide(b.kind) === side).map((b) => ({ key: b.linkId, label: b.title, eff: b.effectiveness, weak: false })),
]

/**
 * Nœud papillon lisible (RFC 0017 Lot E) : 5 zones gauche->droite - cause,
 * barrières préventives (↓ vraisemblance), scénario central (inhérent->résiduel),
 * barrières correctives (↓ impact), conséquence. Lecture seule ; l'édition des
 * barrières se fait dans les sections dessous.
 */
export function ScenarioBowtieDiagram({ scenario, catalog, model, bump, barriers, policyBarriers }: {
  scenario: ScenarioRow; catalog: RiskCatalogEntry[]; model: BowtieModel
  bump: number; barriers: BarrierControl[]; policyBarriers: PolicyBarrier[]
}): JSX.Element {
  const label = (id: string | null): string | null => id ? (catalog.find((c) => c.id === id)?.label ?? null) : null
  const dimColor = scenario.dimension ? SCORE_DIMENSION_COLORS[scenario.dimension] : '#94A3B8'
  const prev = toDiag(barriers, policyBarriers, 'likelihood')
  const corr = toDiag(barriers, policyBarriers, 'impact')
  const { inherentExp, residual, hasBarriers, effPrev, effCorr } = model

  return (
    <div className="px-5 py-5">
      <div className="grid gap-2 lg:grid-cols-5 items-stretch">
        <EndZone title="Cause" tone="red" main={label(scenario.threat_ref) ?? 'Menace non précisée'} sub={label(scenario.source_ref) ?? undefined} />

        <BarrierColumn title="Préventives" effect="↓ vraisemblance" items={prev} tone="#2D6A4F" avg={effPrev} />

        {/* Centre : le scénario / événement */}
        <div className="rounded-xl border-2 p-3 text-center flex flex-col justify-center" style={{ borderColor: dimColor }}>
          <div className="text-[10px] font-mono uppercase tracking-wide text-gray-400">Scénario</div>
          <div className="text-[13px] font-bold text-gray-900 mt-1 leading-snug">{scenario.title}</div>
          {scenario.asset_name && <div className="text-[11px] text-gray-500 mt-0.5">Actif&nbsp;: {scenario.asset_name}</div>}
          {scenario.vulnerability && <div className="text-[11px] text-gray-400 mt-0.5 italic">« {scenario.vulnerability} »</div>}
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-mono">
            <span className="text-gray-400">inhérent <b style={{ color: expColor(inherentExp) }}>{inherentExp}</b></span>
            {hasBarriers && <span className="text-gray-300">&rarr;</span>}
            {hasBarriers && <span className="text-gray-400">résiduel <b style={{ color: expColor(residual) }}>{residual}</b></span>}
          </div>
          <div className="mt-1 text-[9.5px] font-mono text-gray-400">V{scenario.inherent_likelihood}{bump > 0 && <b style={{ color: '#C0392B' }}>+{bump}</b>}·I{scenario.inherent_impact}</div>
          {bump > 0 && <div className="mt-0.5 text-[9.5px] text-[#C0392B]">aggravé par incident (+{bump})</div>}
        </div>

        <BarrierColumn title="Correctives" effect="↓ impact" items={corr} tone="#B8860B" avg={effCorr} />

        <EndZone title="Conséquence" tone="amber" main={label(scenario.feared_event_ref) ?? 'Événement redouté non précisé'} />
      </div>
      <p className="mt-3 text-[11px] text-gray-400 text-center">Lisez de gauche à droite&nbsp;: la cause, les barrières qui abaissent la vraisemblance, le scénario, les barrières qui abaissent l&apos;impact, la conséquence.</p>
    </div>
  )
}

function EndZone({ title, main, sub, tone }: { title: string; main: string; sub?: string; tone: 'red' | 'amber' }): JSX.Element {
  const c = tone === 'red' ? { bg: 'bg-red-50', bd: 'border-red-100', t: 'text-red-700' } : { bg: 'bg-amber-50', bd: 'border-amber-100', t: 'text-amber-700' }
  return (
    <div className={`rounded-xl border ${c.bd} ${c.bg} p-3 flex flex-col justify-center`}>
      <div className={`text-[10px] font-mono uppercase tracking-wide ${c.t}`}>{title}</div>
      <div className="text-[12.5px] font-semibold text-gray-800 mt-1 leading-snug">{main}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function BarrierColumn({ title, effect, items, tone, avg }: { title: string; effect: string; items: DiagBarrier[]; tone: string; avg: number | null }): JSX.Element {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-2.5 flex flex-col">
      <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: tone }}>{title}</div>
      <div className="text-[9.5px] text-gray-400 mb-1.5">{effect}{avg != null && <> · moy {pct(avg)}%</>}</div>
      {items.length === 0 ? (
        <p className="text-[11px] text-gray-300 italic">Aucune barrière</p>
      ) : (
        <div className="space-y-1">
          {items.map((b) => (
            <div key={b.key} className="flex items-center gap-1 rounded-lg bg-white border border-gray-100 px-1.5 py-1 text-[10.5px]">
              {b.weak ? <ShieldX size={11} className="text-amber-500 shrink-0" /> : <ShieldCheck size={11} className="shrink-0" style={{ color: tone }} />}
              <span className="flex-1 truncate text-gray-700" title={b.label}>{b.label}</span>
              <span className="font-mono font-semibold shrink-0" style={{ color: b.eff == null ? '#B8860B' : expColor(100 - pct(b.eff)) }}>{b.eff == null ? 'n/e' : `${pct(b.eff)}%`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
