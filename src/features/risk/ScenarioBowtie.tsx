import { useState } from 'react'
import { X, ArrowRight, Shield, Plus, Trash2 } from 'lucide-react'
import { useScenarioControls, type ControlOption, type BarrierControl } from './useScenarioControls'
import { SCORE_DIMENSION_LABELS, SCORE_DIMENSION_COLORS, RISK_CONTROL_LINK_KINDS } from '../../lib/constants'
import type { RiskCatalogEntry } from '../../types/database.types'
import type { ScenarioRow } from './useRiskRegister'

const kindLabel = (k: string): string => RISK_CONTROL_LINK_KINDS.find((x) => x.value === k)?.label ?? k

/** Nœud papillon EBIOS : menace → [barrières] → scénario/actif → événement redouté. */
export function ScenarioBowtie({ scenario, catalog, onClose }: { scenario: ScenarioRow; catalog: RiskCatalogEntry[]; onClose: () => void }): JSX.Element {
  const { barriers, search, link, unlink } = useScenarioControls(scenario.id)
  const label = (id: string | null): string | null => id ? (catalog.find((c) => c.id === id)?.label ?? null) : null
  const dimColor = scenario.dimension ? SCORE_DIMENSION_COLORS[scenario.dimension] : '#94A3B8'

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
            <div className="mt-2 text-[10px] font-mono text-gray-400">V{scenario.inherent_likelihood}·I{scenario.inherent_impact} · exposition <b style={{ color: scenario.exposure >= 60 ? '#C0392B' : scenario.exposure >= 30 ? '#B8860B' : '#27AE60' }}>{scenario.exposure}</b></div>
          </div>
          <ArrowRight size={18} className="text-gray-300 mx-auto" />
          <BowtieCard title="Événement redouté" tone="amber" main={label(scenario.feared_event_ref) ?? 'Non précisé'} />
        </div>

        {/* Barrières */}
        <div className="px-5 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-forest-700" />
            <h4 className="text-[12px] font-bold uppercase tracking-wide text-gray-500">Barrières (contrôles Comply)</h4>
          </div>
          {barriers.length === 0
            ? <p className="text-[12px] text-gray-400 mb-3">Aucun contrôle-barrière lié. Reliez les contrôles qui maîtrisent ce risque.</p>
            : (
              <div className="flex flex-wrap gap-2 mb-3">
                {barriers.map((b) => (
                  <span key={b.linkId} className="inline-flex items-center gap-1.5 rounded-lg border border-forest-200 bg-forest-50 px-2.5 py-1 text-[11px]">
                    <span className="font-mono font-semibold text-forest-800">{b.code}</span>
                    <span className="text-gray-500">· {kindLabel(b.kind)}</span>
                    <button onClick={() => void unlink(b.linkId)} className="text-gray-400 hover:text-red-600"><Trash2 size={11} /></button>
                  </span>
                ))}
              </div>
            )}
          <ControlLinker existing={barriers} onSearch={search} onLink={link} />
        </div>
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
