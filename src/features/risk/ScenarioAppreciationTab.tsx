import { useState, type ReactNode } from 'react'
import { Shield, Plus, Trash2, AlertTriangle, ChevronRight } from 'lucide-react'
import type { useScenarioControls, ControlOption, BarrierControl } from './useScenarioControls'
import type { useScenarioIncidents, IncidentOption, ScenarioIncident } from './useScenarioIncidents'
import type { useScenarioPolicies, PolicyOption } from '../policy/useScenarioPolicies'
import type { BowtieModel } from './scenarioBowtieModel'
import { ScenarioBowtieDiagram } from './ScenarioBowtieDiagram'
import { useScenarioNodes } from './useScenarioNodes'
import type { RiskScenarioNode, RiskNodeType } from '../../types/database.types'
import { RISK_CONTROL_LINK_KINDS, barrierSide } from '../../lib/constants'
import type { RiskCatalogEntry } from '../../types/database.types'
import type { ScenarioRow } from './useRiskRegister'

const kindLabel = (k: string): string => RISK_CONTROL_LINK_KINDS.find((x) => x.value === k)?.label ?? k
const pct = (v: number): number => Math.round(v * 100)
const expColor = (v: number): string => v >= 60 ? '#C0392B' : v >= 30 ? '#B8860B' : '#27AE60'
const SEV_COLOR: Record<string, string> = { critique: '#C0392B', eleve: '#B8860B', moyen: '#3B82F6', faible: '#6B7280' }

interface Props {
  scenario: ScenarioRow
  catalog: RiskCatalogEntry[]
  model: BowtieModel
  ctrl: ReturnType<typeof useScenarioControls>
  inc: ReturnType<typeof useScenarioIncidents>
  pol: ReturnType<typeof useScenarioPolicies>
}

/** Onglet « Apprécier » (refonte B) : papillon + sections repliables (causes/conséquences,
 *  barrières contrôles+politiques fusionnées, incidents) avec recherche à la demande. */
export function ScenarioAppreciationTab({ scenario, catalog, model, ctrl, inc, pol }: Props): JSX.Element {
  const { barriers } = ctrl
  const { incidents, bump } = inc
  const nodes = useScenarioNodes(scenario.id)
  const prev = barriers.filter((b) => barrierSide(b.kind) === 'likelihood')
  const corr = barriers.filter((b) => barrierSide(b.kind) === 'impact')
  const barrierCount = barriers.length + pol.barriers.length

  return (
    <div>
      <ScenarioBowtieDiagram scenario={scenario} catalog={catalog} model={model} bump={bump}
        barriers={barriers} policyBarriers={pol.barriers}
        causes={nodes.causes.map((n) => n.label)} consequences={nodes.consequences.map((n) => n.label)} />

      <div className="px-5 pb-5">
        <Section title="Causes & conséquences" count={nodes.causes.length + nodes.consequences.length} defaultOpen>
          <div className="grid gap-4 sm:grid-cols-2">
            <NodeColumn title="Causes (menaces)" type="cause" items={nodes.causes} onAdd={nodes.addNode} onRemove={nodes.removeNode} placeholder="ex. Hameçonnage ciblé d'un admin" />
            <NodeColumn title="Conséquences" type="consequence" items={nodes.consequences} onAdd={nodes.addNode} onRemove={nodes.removeNode} placeholder="ex. Fuite de données des assurés" />
          </div>
        </Section>

        <Section title={<span className="inline-flex items-center gap-2"><Shield size={14} className="text-forest-700" /> Barrières</span>} count={barrierCount} defaultOpen>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] text-gray-400">Contrôles Comply et politiques qui maîtrisent ce risque</span>
            <InfoDot text="Préventive abaisse la vraisemblance, corrective/détective abaisse l'impact. Seule une barrière évaluée et approuvée en mission Comply réduit le résiduel (score de confiance)." />
          </div>
          {barrierCount === 0 ? (
            <p className="text-[12px] text-gray-400">Aucune barrière liée.</p>
          ) : (
            <div className="space-y-2">
              <BarrierGroup title="Préventives · ↓ vraisemblance" items={prev} onUnlink={ctrl.unlink} onSetJustification={ctrl.setJustification} />
              <BarrierGroup title="Correctives / détectives · ↓ impact" items={corr} onUnlink={ctrl.unlink} onSetJustification={ctrl.setJustification} />
              {pol.barriers.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {pol.barriers.map((b) => (
                    <span key={b.linkId} className="inline-flex items-center gap-1.5 rounded-lg border border-[#6D5AE6]/30 bg-[#6D5AE6]/[0.07] px-2.5 py-1 text-[11px]">
                      <span className="text-gray-700 max-w-[150px] truncate">{b.title}</span>
                      <span className="text-gray-500">· {kindLabel(b.kind)}</span>
                      <span className="font-semibold" style={{ color: expColor(100 - pct(b.effectiveness)) }}>{pct(b.effectiveness)}%</span>
                      <button onClick={() => void pol.unlink(b.linkId)} className="text-gray-400 hover:text-red-600"><Trash2 size={11} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <AddReveal label="Ajouter une barrière"><BarrierLinker ctrl={ctrl} pol={pol} /></AddReveal>
        </Section>

        <Section title={<span className="inline-flex items-center gap-2"><AlertTriangle size={14} className="text-[#C0392B]" /> Incidents</span>} count={incidents.length}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] text-gray-400">Incidents qui aggravent la vraisemblance</span>
            <InfoDot text="Un incident de la dimension aggrave automatiquement la vraisemblance ; liez-en un explicitement pour cibler ce scénario précis." />
          </div>
          {incidents.length === 0
            ? <p className="text-[12px] text-gray-400">Aucun incident ne cible ce scénario.</p>
            : <div className="flex flex-wrap gap-2">{incidents.map((i) => <IncidentChip key={i.id} inc={i} onUnlink={inc.unlink} />)}</div>}
          <AddReveal label="Lier un incident"><IncidentLinker onSearch={inc.search} onLink={inc.link} existing={incidents} /></AddReveal>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, count, defaultOpen, children }: { title: ReactNode; count: number; defaultOpen?: boolean; children: ReactNode }): JSX.Element {
  return (
    <details open={defaultOpen} className="group border border-gray-200 rounded-xl bg-white mb-3 overflow-hidden">
      <summary className="list-none cursor-pointer flex items-center gap-2.5 px-4 py-3 text-[13px] font-semibold text-gray-800 hover:bg-gray-50">
        {title}
        <span className="font-mono text-[11px] font-bold text-forest-700 bg-forest-50 border border-forest-100 rounded-full px-2 py-0.5">{count}</span>
        <ChevronRight size={15} className="ml-auto text-gray-400 transition-transform group-open:rotate-90" />
      </summary>
      <div className="px-4 pb-4 pt-1 border-t border-gray-100">{children}</div>
    </details>
  )
}

function InfoDot({ text }: { text: string }): JSX.Element {
  return <span title={text} className="inline-grid place-items-center w-[15px] h-[15px] rounded-full border border-gray-300 text-gray-400 text-[10px] font-bold cursor-help shrink-0">i</span>
}

function AddReveal({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  const [show, setShow] = useState(false)
  if (!show) return <button onClick={() => setShow(true)} className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-semibold text-forest-700 border border-forest-200 rounded-lg hover:bg-forest-50"><Plus size={13} /> {label}</button>
  return (
    <div className="mt-3">
      {children}
      <button onClick={() => setShow(false)} className="mt-2 text-[12px] text-gray-500 hover:text-gray-700">Fermer</button>
    </div>
  )
}

function NodeColumn({ title, type, items, onAdd, onRemove, placeholder }: {
  title: string; type: RiskNodeType; items: RiskScenarioNode[]
  onAdd: (t: RiskNodeType, label: string) => Promise<boolean>; onRemove: (id: string) => Promise<void>; placeholder: string
}): JSX.Element {
  const [val, setVal] = useState('')
  const submit = async (): Promise<void> => { if (!val.trim()) return; const ok = await onAdd(type, val); if (ok) setVal('') }
  return (
    <div>
      <div className="text-[11px] font-semibold text-gray-600 mb-2">{title}</div>
      {items.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {items.map((n) => (
            <div key={n.id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[12px]">
              <span className="flex-1 text-gray-700">{n.label}</span>
              <button onClick={() => void onRemove(n.id)} className="text-gray-400 hover:text-red-600" aria-label="Retirer"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submit() }} placeholder={placeholder} className="flex-1 px-2.5 py-1.5 text-[12px] border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700" />
        <button onClick={() => void submit()} disabled={!val.trim()} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-semibold text-forest-700 border border-forest-200 rounded-lg hover:bg-forest-50 disabled:opacity-50"><Plus size={13} /></button>
      </div>
    </div>
  )
}

function BarrierGroup({ title, items, onUnlink, onSetJustification }: { title: string; items: BarrierControl[]; onUnlink: (id: string) => Promise<void>; onSetJustification: (id: string, text: string) => Promise<void> }): JSX.Element | null {
  if (items.length === 0) return null
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wide text-gray-400 mb-1">{title}</div>
      <div className="space-y-1.5">
        {items.map((b) => (
          <div key={b.linkId} className="rounded-lg border border-forest-200 bg-forest-50 px-2.5 py-1.5 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-semibold text-forest-800">{b.code}</span>
              <span className="text-gray-500">· {kindLabel(b.kind)}</span>
              {b.assessed
                ? <span className="font-semibold" style={{ color: expColor(100 - pct(b.effectiveness)) }}>{pct(b.effectiveness)}%</span>
                : <span className="text-amber-600" title="Contrôle non évalué en mission → efficacité nulle">non évaluée</span>}
              <button onClick={() => void onUnlink(b.linkId)} className="text-gray-400 hover:text-red-600 ml-auto"><Trash2 size={11} /></button>
            </div>
            <input defaultValue={b.justification ?? ''}
              onBlur={(e) => { if ((e.target.value.trim() || null) !== (b.justification ?? null)) void onSetJustification(b.linkId, e.target.value) }}
              placeholder="Justification d'applicabilité (SoA)..."
              className="mt-1 w-full border border-gray-200 rounded px-2 py-1 text-[11px] bg-white" />
          </div>
        ))}
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
      <input value={q} onChange={(e) => void run(e.target.value)} placeholder="Rechercher un incident à lier..." className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700" />
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

/** Linker unifié (option B) : une barrière = un contrôle Comply OU une politique. */
function BarrierLinker({ ctrl, pol }: { ctrl: ReturnType<typeof useScenarioControls>; pol: ReturnType<typeof useScenarioPolicies> }): JSX.Element {
  const [source, setSource] = useState<'control' | 'policy'>('control')
  const [q, setQ] = useState('')
  const [ctrlRes, setCtrlRes] = useState<ControlOption[]>([])
  const [polRes, setPolRes] = useState<PolicyOption[]>([])
  const [kind, setKind] = useState<BarrierControl['kind']>('preventive')
  const linkedCtrl = new Set(ctrl.barriers.map((b) => b.control_id))
  const linkedPol = new Set(pol.barriers.map((b) => b.policy_id))
  const run = async (v: string): Promise<void> => { setQ(v); if (source === 'control') setCtrlRes(await ctrl.search(v)); else setPolRes(await pol.search(v)) }
  const pick = (s: 'control' | 'policy'): void => { setSource(s); setQ(''); setCtrlRes([]); setPolRes([]) }
  const segCls = (on: boolean): string => `px-3 py-1.5 text-[12px] font-semibold ${on ? 'bg-forest-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex gap-2 mb-2 flex-wrap">
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          <button onClick={() => pick('control')} className={segCls(source === 'control')}>Contrôle</button>
          <button onClick={() => pick('policy')} className={`border-l border-gray-200 ${segCls(source === 'policy')}`}>Politique</button>
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value as BarrierControl['kind'])} className="px-2 py-1.5 text-[12px] border border-gray-300 rounded-lg">
          {RISK_CONTROL_LINK_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
      </div>
      <input value={q} onChange={(e) => void run(e.target.value)} placeholder={source === 'control' ? 'Rechercher un contrôle (code ou nom)...' : 'Rechercher une politique...'} className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700" />
      {source === 'control' && ctrlRes.length > 0 && (
        <ul className="mt-2 max-h-40 overflow-y-auto divide-y divide-gray-50">
          {ctrlRes.map((c) => (
            <li key={c.id} className="flex items-center gap-2 py-1.5 text-[12px]">
              <span className="font-mono font-semibold text-forest-800 min-w-[54px]">{c.code}</span>
              <span className="flex-1 truncate text-gray-600">{c.name}</span>
              {linkedCtrl.has(c.id)
                ? <span className="text-[10px] text-gray-400">lié</span>
                : <button onClick={() => { void ctrl.link(c.id, kind); setQ(''); setCtrlRes([]) }} className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700 hover:text-forest-900"><Plus size={12} /> Lier</button>}
            </li>
          ))}
        </ul>
      )}
      {source === 'policy' && polRes.length > 0 && (
        <ul className="mt-2 max-h-40 overflow-y-auto divide-y divide-gray-50">
          {polRes.map((p) => (
            <li key={p.id} className="flex items-center gap-2 py-1.5 text-[12px]">
              <span className="flex-1 truncate text-gray-600">{p.title}</span>
              {linkedPol.has(p.id)
                ? <span className="text-[10px] text-gray-400">liée</span>
                : <button onClick={() => { void pol.link(p.id, kind); setQ(''); setPolRes([]) }} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6D5AE6] hover:brightness-110"><Plus size={12} /> Lier</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
