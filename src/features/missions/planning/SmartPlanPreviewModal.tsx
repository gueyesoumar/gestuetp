import { useState, useMemo } from 'react'
import { X, Sparkles, Check, Loader2, Info } from 'lucide-react'
import type { ControlPlanning, RiskLevel, AuditTechnique } from '../../../types/database.types'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { ControlAssignmentRow, MissionMemberRow } from '../useMissionDetail'

export interface SmartPlanProposal {
  id: string
  risk_level: RiskLevel
  audit_techniques: AuditTechnique[]
  estimated_hours: number
  sampling_population: number | null
  sampling_size: number | null
  notes: string | null
  reasoning: string | null
}

export interface SmartPlanAssignment {
  control_id: string
  auditor_id: string
}

interface SmartPlanPreviewModalProps {
  proposals: SmartPlanProposal[]
  assignments: SmartPlanAssignment[]
  domains: DomainWithControls[]
  currentPlannings: ControlPlanning[]
  currentAssignments: ControlAssignmentRow[]
  members: MissionMemberRow[]
  applying: boolean
  onApply: (selectedControlIds: Set<string>) => Promise<void>
  onClose: () => void
}

const RISK_LABEL: Record<RiskLevel, { label: string; cls: string }> = {
  critical: { label: 'Critique', cls: 'bg-red-50 text-red-700 border-red-200' },
  high: { label: 'Élevé', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  medium: { label: 'Moyen', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  low: { label: 'Faible', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
}

export function SmartPlanPreviewModal({ proposals, assignments, domains, currentPlannings, currentAssignments, members, applying, onApply, onClose }: SmartPlanPreviewModalProps) {
  const controlMap = useMemo(() => {
    const m = new Map<string, { code: string; name: string; domainCode: string }>()
    for (const d of domains) for (const c of d.controls) m.set(c.id, { code: c.code, name: c.name, domainCode: d.code })
    return m
  }, [domains])

  const planMap = useMemo(() => new Map(currentPlannings.map((p) => [p.control_id, p])), [currentPlannings])
  const assignMap = useMemo(() => new Map(currentAssignments.map((a) => [a.control_id, a.auditor_id])), [currentAssignments])
  const proposalAssignMap = useMemo(() => new Map(assignments.map((a) => [a.control_id, a.auditor_id])), [assignments])
  const auditorMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of members) m.set(a.user_id, `${a.user.first_name[0]}. ${a.user.last_name}`)
    return m
  }, [members])

  // Compute diffs
  const diffs = useMemo(() => proposals.map((p) => {
    const ctrl = controlMap.get(p.id)
    const current = planMap.get(p.id)
    const currentAuditor = assignMap.get(p.id) ?? null
    const proposedAuditor = proposalAssignMap.get(p.id) ?? null

    const riskChanged = (current?.risk_level ?? 'medium') !== p.risk_level
    const currentTechs = (current?.audit_techniques ?? []).slice().sort()
    const proposedTechs = p.audit_techniques.slice().sort()
    const techsChanged = JSON.stringify(currentTechs) !== JSON.stringify(proposedTechs)
    const auditorChanged = currentAuditor !== proposedAuditor && proposedAuditor !== null

    const hasChange = riskChanged || techsChanged || auditorChanged
    return {
      controlId: p.id,
      code: ctrl?.code ?? p.id.slice(0, 8),
      name: ctrl?.name ?? '',
      domainCode: ctrl?.domainCode ?? '',
      proposal: p,
      currentRisk: current?.risk_level ?? 'medium' as RiskLevel,
      currentTechs,
      proposedTechs,
      currentAuditor,
      proposedAuditor,
      riskChanged, techsChanged, auditorChanged,
      hasChange,
    }
  }), [proposals, controlMap, planMap, assignMap, proposalAssignMap])

  const changedDiffs = diffs.filter((d) => d.hasChange)
  const [selected, setSelected] = useState<Set<string>>(new Set(changedDiffs.map((d) => d.controlId)))

  const stats = useMemo(() => ({
    riskChanges: changedDiffs.filter((d) => d.riskChanged).length,
    techsChanges: changedDiffs.filter((d) => d.techsChanged).length,
    auditorChanges: changedDiffs.filter((d) => d.auditorChanged).length,
  }), [changedDiffs])

  const toggle = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const allChecked = selected.size === changedDiffs.length && changedDiffs.length > 0

  const toggleAll = (): void => {
    if (allChecked) setSelected(new Set())
    else setSelected(new Set(changedDiffs.map((d) => d.controlId)))
  }

  const handleApplySelected = async (): Promise<void> => {
    await onApply(selected)
  }

  const handleApplyAll = async (): Promise<void> => {
    await onApply(new Set(changedDiffs.map((d) => d.controlId)))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-gray-200 bg-purple-50 flex items-center gap-3">
          <Sparkles size={16} className="text-purple-700" />
          <div className="flex-1">
            <p className="text-[14px] font-bold text-purple-900">Aper&ccedil;u SmartPlan</p>
            <p className="text-[11px] text-purple-700 mt-0.5">
              {changedDiffs.length === 0
                ? 'Aucun changement proposé.'
                : `${changedDiffs.length} contrôle${changedDiffs.length > 1 ? 's' : ''} avec changements proposés.`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        {/* Stats */}
        {changedDiffs.length > 0 && (
          <div className="px-5 py-2.5 border-b border-gray-200 bg-[#FAFAFA] flex items-center gap-4 text-[11px]">
            <StatBadge label="Risques modifi&eacute;s" count={stats.riskChanges} />
            <StatBadge label="Techniques chang&eacute;es" count={stats.techsChanges} />
            <StatBadge label="Affectations propos&eacute;es" count={stats.auditorChanges} />
            <div className="ml-auto flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 accent-forest-700"
                />
                S&eacute;lectionner tout
              </label>
            </div>
          </div>
        )}

        {/* Diff list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {changedDiffs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Info size={32} className="text-gray-300 mb-3" />
              <p className="text-[13px] text-gray-500">Le programme actuel est d&eacute;j&agrave; conforme aux recommandations IA.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {changedDiffs.map((d) => {
                const isPicked = selected.has(d.controlId)
                return (
                  <div
                    key={d.controlId}
                    className={`border rounded-lg p-3 transition-colors ${isPicked ? 'border-forest-300 bg-forest-50/40' : 'border-gray-200 bg-white opacity-70'}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isPicked}
                        onChange={() => toggle(d.controlId)}
                        className="mt-1 w-3.5 h-3.5 accent-forest-700 cursor-pointer shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-forest-700">{d.code}</span>
                          <span className="text-[12px] font-medium text-gray-900 truncate flex-1">{d.name}</span>
                          <span className="text-[9px] font-mono text-gray-400">{d.domainCode}</span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                          {d.riskChanged && (
                            <DiffField
                              label="Risque"
                              before={<RiskPill level={d.currentRisk} />}
                              after={<RiskPill level={d.proposal.risk_level} />}
                            />
                          )}
                          {d.techsChanged && (
                            <DiffField
                              label="Techniques"
                              before={<span className="text-gray-500">{d.currentTechs.join(', ') || '—'}</span>}
                              after={<span className="text-forest-700 font-medium">{d.proposedTechs.join(', ') || '—'}</span>}
                            />
                          )}
                          {d.auditorChanged && (
                            <DiffField
                              label="Auditeur"
                              before={<span className="text-gray-500">{d.currentAuditor ? auditorMap.get(d.currentAuditor) ?? '?' : '—'}</span>}
                              after={<span className="text-forest-700 font-medium">{d.proposedAuditor ? auditorMap.get(d.proposedAuditor) ?? '?' : '—'}</span>}
                            />
                          )}
                        </div>

                        {d.proposal.reasoning && (
                          <p className="text-[10.5px] text-gray-500 italic mt-1.5 leading-snug">
                            <Sparkles size={10} className="inline mr-1 text-purple-500" />
                            {d.proposal.reasoning}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 bg-[#FAFAFA] flex items-center gap-2">
          <button onClick={onClose} disabled={applying} className="text-[12px] text-gray-500 hover:text-gray-700 px-3 py-2 disabled:opacity-50">
            Annuler
          </button>
          {changedDiffs.length > 0 && (
            <>
              <button
                onClick={() => void handleApplyAll()}
                disabled={applying}
                className="ml-auto text-[12px] text-purple-700 border border-purple-300 hover:bg-purple-50 px-3 py-2 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                Tout appliquer ({changedDiffs.length})
              </button>
              <button
                onClick={() => void handleApplySelected()}
                disabled={applying || selected.size === 0}
                className="bg-forest-700 text-white px-4 py-2 rounded-lg text-[12px] font-semibold hover:bg-forest-900 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {applying ? <><Loader2 size={12} className="animate-spin" /> Application...</> : <><Check size={12} /> Appliquer la s&eacute;lection ({selected.size})</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StatBadge({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-bold text-gray-900">{count}</span>
      <span className="text-[11px] text-gray-500">{label}</span>
    </div>
  )
}

function DiffField({ label, before, after }: { label: string; before: React.ReactNode; after: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">{label}</span>
      {before}
      <span className="text-gray-400">→</span>
      {after}
    </span>
  )
}

function RiskPill({ level }: { level: RiskLevel }) {
  const cfg = RISK_LABEL[level]
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.cls}`}>{cfg.label}</span>
}
