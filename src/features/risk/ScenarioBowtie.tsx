import { useState } from 'react'
import { X, ArrowRight, Shield, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { useScenarioControls, type ControlOption, type BarrierControl } from './useScenarioControls'
import { useScenarioIncidents, type IncidentOption, type ScenarioIncident } from './useScenarioIncidents'
import {
  SCORE_DIMENSION_LABELS, SCORE_DIMENSION_COLORS, RISK_CONTROL_LINK_KINDS,
  barrierSide, splitBarrierEfficacies, riskResidualSplit, riskExposure,
} from '../../lib/constants'
import type { RiskCatalogEntry } from '../../types/database.types'
import type { ScenarioRow } from './useRiskRegister'

const kindLabel = (k: string): string => RISK_CONTROL_LINK_KINDS.find((x) => x.value === k)?.label ?? k
const pct = (v: number): number => Math.round(v * 100)
const expColor = (v: number): string => v >= 60 ? '#C0392B' : v >= 30 ? '#B8860B' : '#27AE60'
const SEV_COLOR: Record<string, string> = { critique: '#C0392B', eleve: '#B8860B', moyen: '#3B82F6', faible: '#6B7280' }

/** Nœud papillon EBIOS : menace → [barrières] → scénario/actif → événement redouté. */
export function ScenarioBowtie({ scenario, catalog, onClose }: { scenario: ScenarioRow; catalog: RiskCatalogEntry[]; onClose: () => void }): JSX.Element {
  const { barriers, search, link, unlink } = useScenarioControls(scenario.id)
  const { incidents, bump, search: searchInc, link: linkInc, unlink: unlinkInc } = useScenarioIncidents(scenario.id, scenario.dimension)
  const label = (id: string | null): string | null => id ? (catalog.find((c) => c.id === id)?.label ?? null) : null
  const dimColor = scenario.dimension ? SCORE_DIMENSION_COLORS[scenario.dimension] : '#94A3B8'
  // Vraisemblance effective = inhérente + aggravation incidents (plafond 4).
  const effL = Math.min(4, scenario.inherent_likelihood + bump)
  const inherentExp = riskExposure(effL, scenario.inherent_impact)
  // Barrières : préventives ↓ vraisemblance, correctives ↓ impact.
  const { effPrev, effCorr } = splitBarrierEfficacies(barriers)
  const hasBarriers = barriers.length > 0
  const residual = hasBarriers ? riskResidualSplit(effL, scenario.inherent_impact, effPrev, effCorr) : inherentExp
  const prev = barriers.filter((b) => barrierSide(b.kind) === 'likelihood')
  const corr = barriers.filter((b) => barrierSide(b.kind) === 'impact')

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">{scenario.title}</h3>
            {scenario.dimension && <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: `${dimColor}22`, color: dimColor }}>{SCORE_DIMENSION_LABELS[scenario.dimension]}</span>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Bowtie */}
        <div className="px-5 py-5 grid grid-cols-[1fr_auto_1.2fr_auto_1fr] gap-3 items-center">
          <BowtieCard title="Menace" tone="red" main={label(scenario.threat_ref) ?? 'Non précisée'} sub={label(scenario.source_ref) ?? undefined} />
          <ArrowRight size={18} className="text-gray-300 mx-auto" />
          <div className="rounded-xl border-2 p-3 text-center" style={{ borderColor: dimColor }}>
            <div className="text-[10px] font-mono uppercase tracking-wide text-gray-400">Scénario</div>
            <div className="text-[13px] font-bold text-gray-900 mt-1">{scenario.title}</div>
            {scenario.asset_name && <div className="text-[11px] text-gray-500 mt-0.5">Actif&nbsp;: {scenario.asset_name}</div>}
            {scenario.vulnerability && <div className="text-[11px] text-gray-400 mt-0.5 italic">« {scenario.vulnerability} »</div>}
            <div className="mt-2 text-[10px] font-mono text-gray-400">
              V{scenario.inherent_likelihood}{bump > 0 && <b style={{ color: '#C0392B' }}>+{bump}</b>}·I{scenario.inherent_impact}
            </div>
            <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[10px] font-mono">
              <span className="text-gray-400">inhérent <b style={{ color: expColor(inherentExp) }}>{inherentExp}</b></span>
              {hasBarriers && <span className="text-gray-300">→</span>}
              {hasBarriers && <span className="text-gray-400">résiduel <b style={{ color: expColor(residual) }}>{residual}</b></span>}
            </div>
            {bump > 0 && <div className="mt-1 text-[9.5px] text-[#C0392B]">vraisemblance aggravée par incident (+{bump})</div>}
            {hasBarriers && (
              <div className="mt-1 text-[9.5px] text-forest-700 space-y-0.5">
                <div>préventif <b>{effPrev == null ? '—' : `${pct(effPrev)}%`}</b> · ↓ vraisemblance</div>
                <div>correctif <b>{effCorr == null ? '—' : `${pct(effCorr)}%`}</b> · ↓ impact</div>
              </div>
            )}
          </div>
          <ArrowRight size={18} className="text-gray-300 mx-auto" />
          <BowtieCard title="Événement redouté" tone="amber" main={label(scenario.feared_event_ref) ?? 'Non précisé'} />
        </div>

        {/* Barrières */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-forest-700" />
            <h4 className="text-[12px] font-bold uppercase tracking-wide text-gray-500">Barrières (contrôles Comply)</h4>
          </div>
          {!hasBarriers
            ? <p className="text-[12px] text-gray-400 mb-3">Aucun contrôle-barrière lié. Reliez les contrôles qui maîtrisent ce risque.</p>
            : (
              <div className="space-y-2 mb-3">
                <BarrierGroup title="Préventives · ↓ vraisemblance" items={prev} onUnlink={unlink} />
                <BarrierGroup title="Correctives / détectives · ↓ impact" items={corr} onUnlink={unlink} />
              </div>
            )}
          <p className="text-[11px] text-gray-400 mb-2">Seule une barrière <b>évaluée et approuvée</b> en mission Comply réduit le résiduel — c&apos;est ce lien qui fait vivre le score de confiance.</p>
          <ControlLinker existing={barriers} onSearch={search} onLink={link} />
        </div>

        {/* Incidents (Regul → aggravation vraisemblance) */}
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-[#C0392B]" />
            <h4 className="text-[12px] font-bold uppercase tracking-wide text-gray-500">Incidents (aggravation vraisemblance)</h4>
          </div>
          {incidents.length === 0
            ? <p className="text-[12px] text-gray-400 mb-3">Aucun incident récent n&apos;aggrave ce scénario.</p>
            : (
              <div className="flex flex-wrap gap-2 mb-3">
                {incidents.map((i) => <IncidentChip key={i.id} inc={i} onUnlink={unlinkInc} />)}
              </div>
            )}
          <p className="text-[11px] text-gray-400 mb-2">Un incident de la dimension aggrave <b>automatiquement</b> la vraisemblance ; liez-en un explicitement pour cibler ce scénario précis.</p>
          <IncidentLinker onSearch={searchInc} onLink={linkInc} existing={incidents} />
        </div>
      </div>
    </div>
  )
}

function IncidentChip({ inc, onUnlink }: { inc: ScenarioIncident; onUnlink: (id: string) => Promise<void> }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1 text-[11px]">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: SEV_COLOR[inc.severity] ?? '#6B7280' }} />
      <span className="text-gray-700 max-w-[160px] truncate">{inc.title}</span>
      <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">{inc.explicit ? 'lié' : 'auto'}</span>
      {inc.explicit && inc.linkId && (
        <button onClick={() => void onUnlink(inc.linkId as string)} className="text-gray-400 hover:text-red-600"><Trash2 size={11} /></button>
      )}
    </span>
  )
}

function IncidentLinker({ existing, onSearch, onLink }: {
  existing: ScenarioIncident[]
  onSearch: (q: string) => Promise<IncidentOption[]>
  onLink: (id: string) => Promise<void>
}): JSX.Element {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<IncidentOption[]>([])
  const linkedIds = new Set(existing.filter((i) => i.explicit).map((i) => i.id))
  const run = async (v: string): Promise<void> => { setQ(v); setResults(await onSearch(v)) }

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <input value={q} onChange={(e) => void run(e.target.value)} placeholder="Rechercher un incident à lier…" className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700" />
      {results.length > 0 && (
        <ul className="mt-2 max-h-40 overflow-y-auto divide-y divide-gray-50">
          {results.map((i) => (
            <li key={i.id} className="flex items-center gap-2 py-1.5 text-[12px]">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: SEV_COLOR[i.severity] ?? '#6B7280' }} />
              <span className="flex-1 truncate text-gray-600">{i.title}</span>
              {linkedIds.has(i.id)
                ? <span className="text-[10px] text-gray-400">lié</span>
                : <button onClick={() => { void onLink(i.id); setQ(''); setResults([]) }} className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700 hover:text-forest-900"><Plus size={12} /> Lier</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BarrierGroup({ title, items, onUnlink }: { title: string; items: BarrierControl[]; onUnlink: (id: string) => Promise<void> }): JSX.Element | null {
  if (items.length === 0) return null
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wide text-gray-400 mb-1">{title}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((b) => (
          <span key={b.linkId} className="inline-flex items-center gap-1.5 rounded-lg border border-forest-200 bg-forest-50 px-2.5 py-1 text-[11px]">
            <span className="font-mono font-semibold text-forest-800">{b.code}</span>
            <span className="text-gray-500">· {kindLabel(b.kind)}</span>
            {b.assessed
              ? <span className="font-semibold" style={{ color: expColor(100 - pct(b.effectiveness)) }}>{pct(b.effectiveness)}%</span>
              : <span className="text-amber-600" title="Contrôle non évalué en mission → efficacité nulle">non évaluée</span>}
            <button onClick={() => void onUnlink(b.linkId)} className="text-gray-400 hover:text-red-600"><Trash2 size={11} /></button>
          </span>
        ))}
      </div>
    </div>
  )
}

function BowtieCard({ title, main, sub, tone }: { title: string; main: string; sub?: string; tone: 'red' | 'amber' }): JSX.Element {
  const c = tone === 'red' ? { bg: 'bg-red-50', bd: 'border-red-100', t: 'text-red-700' } : { bg: 'bg-amber-50', bd: 'border-amber-100', t: 'text-amber-700' }
  return (
    <div className={`rounded-xl border ${c.bd} ${c.bg} p-3 text-center`}>
      <div className={`text-[10px] font-mono uppercase tracking-wide ${c.t}`}>{title}</div>
      <div className="text-[12.5px] font-semibold text-gray-800 mt-1">{main}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function ControlLinker({ existing, onSearch, onLink }: {
  existing: BarrierControl[]
  onSearch: (q: string) => Promise<ControlOption[]>
  onLink: (id: string, kind: BarrierControl['kind']) => Promise<void>
}): JSX.Element {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<ControlOption[]>([])
  const [kind, setKind] = useState<BarrierControl['kind']>('preventive')
  const linkedIds = new Set(existing.map((b) => b.control_id))

  const run = async (v: string): Promise<void> => { setQ(v); setResults(await onSearch(v)) }

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex gap-2">
        <input value={q} onChange={(e) => void run(e.target.value)} placeholder="Rechercher un contrôle (code ou nom)…" className="flex-1 px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700" />
        <select value={kind} onChange={(e) => setKind(e.target.value as BarrierControl['kind'])} className="px-2 py-2 text-[12px] border border-gray-300 rounded-lg">
          {RISK_CONTROL_LINK_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
      </div>
      {results.length > 0 && (
        <ul className="mt-2 max-h-40 overflow-y-auto divide-y divide-gray-50">
          {results.map((c) => (
            <li key={c.id} className="flex items-center gap-2 py-1.5 text-[12px]">
              <span className="font-mono font-semibold text-forest-800 min-w-[54px]">{c.code}</span>
              <span className="flex-1 truncate text-gray-600">{c.name}</span>
              {linkedIds.has(c.id)
                ? <span className="text-[10px] text-gray-400">lié</span>
                : <button onClick={() => { void onLink(c.id, kind); setQ(''); setResults([]) }} className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700 hover:text-forest-900"><Plus size={12} /> Lier</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
