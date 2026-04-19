import { useState, useMemo } from 'react'
import { Badge } from '../../../components/ui/Badge'
import type { MissionDetail } from '../useMissionDetail'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { MissionExclusion, CabinetClient } from '../../../types/database.types'

interface ScopingScopeTabProps {
  mission: MissionDetail
  domains: DomainWithControls[]
  exclusions: MissionExclusion[]
  client: CabinetClient | null
  onAddExclusion: (controlId: string, reason: string) => void
  onRemoveExclusion: (id: string) => void
  saving: boolean
}

export function ScopingScopeTab({ mission, domains, exclusions, client, onAddExclusion, onRemoveExclusion, saving }: ScopingScopeTabProps) {
  const excludedControlIds = useMemo(() => new Set(exclusions.map((e) => e.control_id)), [exclusions])
  const totalControls = domains.reduce((s, d) => s + d.controls.length, 0)
  const excludedCount = excludedControlIds.size
  const includedCount = totalControls - excludedCount

  const objectives = useMemo(() => generateObjectives(mission, client), [mission, client])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Objectives — auto-generated structured cards */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <h4 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">&#127919; Objectifs de la mission</h4>
          <span className="text-[10px] font-medium text-purple-500 flex items-center gap-1">&#9733; Auto-g&eacute;n&eacute;r&eacute;</span>
        </div>
        <div className="px-5 py-2">
          {objectives.map((obj, i) => (
            <div key={i} className="flex items-start gap-3 py-3.5 border-b border-gray-50 last:border-b-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5 ${obj.iconBg}`}>
                {obj.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900">{obj.title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{obj.description}</p>
                <p className="text-[10px] text-gray-300 mt-2 flex items-center gap-1">&#9733; {obj.source}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scope: controls by domain */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <h4 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">&#128204; P&eacute;rim&egrave;tre des contr&ocirc;les</h4>
          <Badge label={`${includedCount} inclus \u00b7 ${excludedCount} exclus`} variant={excludedCount === 0 ? 'green' : 'gold'} />
        </div>
        <div className="px-5 py-2">
          {domains.map((domain) => (
            <DomainScope key={domain.id} domain={domain} exclusions={exclusions} excludedControlIds={excludedControlIds}
              onExclude={onAddExclusion} onInclude={onRemoveExclusion} saving={saving} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ====== Auto-generated objectives ====== */

interface ObjectiveItem {
  icon: string
  iconBg: string
  title: string
  description: string
  source: string
}

function generateObjectives(mission: MissionDetail, client: CabinetClient | null): ObjectiveItem[] {
  const fw = mission.framework
  const regs = client?.exigences_reglementaires ?? []
  const items: ObjectiveItem[] = []

  // 1. Always: evaluate conformity to the framework
  if (fw) {
    items.push({
      icon: '\uD83C\uDFAF', iconBg: 'bg-forest-100 text-forest-700',
      title: `\u00c9valuer la conformit\u00e9 ${fw.category === 'evaluation' ? 'et la maturit\u00e9' : 'du SMSI'}`,
      description: `Mesurer le niveau de conformit\u00e9 par rapport aux exigences ${fw.name}${fw.version ? ` v${fw.version}` : ''}.`,
      source: `D\u00e9duit du r\u00e9f\u00e9rentiel ${fw.name}`,
    })
  }

  // 2. Identify gaps
  items.push({
    icon: '\uD83D\uDD0D', iconBg: 'bg-blue-50 text-blue-600',
    title: 'Identifier les \u00e9carts et non-conformit\u00e9s',
    description: 'D\u00e9tecter les \u00e9carts critiques entre les pratiques actuelles et les exigences du r\u00e9f\u00e9rentiel, avec priorisation par niveau de risque.',
    source: 'Objectif standard pour audit de conformit\u00e9',
  })

  // 3. Regulatory compliance (if client has regulations)
  if (regs.length > 0) {
    const regNames = regs.slice(0, 3).map((r) => r.nom).join(', ')
    const extra = regs.length > 3 ? ` et ${regs.length - 3} autre${regs.length - 3 > 1 ? 's' : ''}` : ''
    items.push({
      icon: '\u2696', iconBg: 'bg-gold-50 text-gold-600',
      title: 'V\u00e9rifier la conformit\u00e9 r\u00e9glementaire',
      description: `S\u2019assurer du respect des exigences de ${regNames}${extra}.`,
      source: `D\u00e9duit des ${regs.length} r\u00e9glementation${regs.length > 1 ? 's' : ''} du client`,
    })
  }

  // 4. Remediation plan
  items.push({
    icon: '\uD83D\uDCC8', iconBg: 'bg-purple-50 text-purple-600',
    title: 'Formuler un plan de rem\u00e9diation',
    description: 'Proposer des recommandations concr\u00e8tes et un plan d\u2019action prioris\u00e9 pour atteindre la conformit\u00e9 cible.',
    source: 'Objectif standard pour audit de conformit\u00e9',
  })

  return items
}

/* ====== Domain / Control scope ====== */

function DomainScope({ domain, exclusions, excludedControlIds, onExclude, onInclude, saving }: {
  domain: DomainWithControls; exclusions: MissionExclusion[]; excludedControlIds: Set<string>
  onExclude: (controlId: string, reason: string) => void; onInclude: (exclusionId: string) => void; saving: boolean
}) {
  const [open, setOpen] = useState(false)
  const domainExcluded = domain.controls.filter((c) => excludedControlIds.has(c.id)).length
  const domainIncluded = domain.controls.length - domainExcluded

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 py-2.5 text-left hover:bg-forest-50 transition-colors rounded">
        <svg className={`w-3.5 h-3.5 text-gray-300 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        <span className="text-[11px] font-mono font-semibold text-forest-700">{domain.code}</span>
        <span className="text-xs text-gray-900 flex-1">{domain.name}</span>
        <span className="text-[10px] text-gray-300">{domainIncluded}/{domain.controls.length}</span>
        {domainExcluded > 0 && <Badge label={`${domainExcluded} exclus`} variant="red" />}
      </button>

      {open && domain.controls.map((control) => {
        const exclusion = exclusions.find((e) => e.control_id === control.id)
        const isExcluded = !!exclusion
        return (
          <ControlRow key={control.id} code={control.code} name={control.name} excluded={isExcluded}
            reason={exclusion?.reason}
            onExclude={(reason) => onExclude(control.id, reason)} onInclude={() => exclusion && onInclude(exclusion.id)} saving={saving} />
        )
      })}
    </div>
  )
}

function ControlRow({ code, name, excluded, reason, onExclude, onInclude, saving }: {
  code: string; name: string; excluded: boolean; reason?: string
  onExclude: (reason: string) => void; onInclude: () => void; saving: boolean
}) {
  const [showForm, setShowForm] = useState(false)
  const [newReason, setNewReason] = useState('')

  if (excluded) {
    return (
      <div className="flex items-center gap-2 py-1.5 pl-8 pr-2 bg-red-50 border-b border-red-100">
        <span className="text-red-400 text-sm">&#10007;</span>
        <span className="text-[11px] font-mono text-red-400 line-through">{code}</span>
        <span className="text-[11px] text-red-400 line-through flex-1 truncate">{name}</span>
        <span className="text-[10px] text-red-400 truncate max-w-[160px]" title={reason}>{reason}</span>
        <button onClick={onInclude} disabled={saving} className="text-[10px] text-forest-700 bg-forest-50 border border-forest-300 px-1.5 py-0.5 rounded hover:bg-forest-100 disabled:opacity-40 shrink-0">Inclure</button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-1.5 pl-8 pr-2 border-b border-gray-50">
      <span className="text-green-500 text-sm">&#10003;</span>
      <span className="text-[11px] font-mono text-forest-700">{code}</span>
      <span className="text-[11px] text-gray-700 flex-1 truncate">{name}</span>
      {showForm ? (
        <div className="flex items-center gap-1 shrink-0">
          <input type="text" value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="Justification..."
            className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 w-[140px] outline-none focus:border-forest-500" />
          <button onClick={() => { if (newReason.trim()) { onExclude(newReason); setShowForm(false); setNewReason('') } }}
            disabled={saving || !newReason.trim()} className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded disabled:opacity-40">Exclure</button>
          <button onClick={() => setShowForm(false)} className="text-[10px] text-gray-400">&#10005;</button>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="text-[10px] text-gray-300 hover:text-red-500 shrink-0">Exclure</button>
      )}
    </div>
  )
}
