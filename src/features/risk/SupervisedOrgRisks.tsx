import { useEffect, useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useSupervisedRisks, type SupervisedRisk, type PortfolioOrg } from './useSupervisedPortfolio'
import { useSupervisorDirectives } from './useSupervisorDirectives'
import { useVocab } from '../edition/useVocab'
import { useToast } from '../../hooks/useToast'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { AuditedScenarioBowtie, type AuditedScenario } from '../missions/AuditedScenarioBowtie'
import { ScenarioFormModal } from './ScenarioFormModal'
import { RequestActionPanel } from './RequestActionPanel'
import type { NewScenario } from './useRiskRegister'
import { SCORE_DIMENSION_LABELS, SCORE_DIMENSION_COLORS, RISK_TREATMENTS, RISK_LIFECYCLE_STATUS, riskExposure, type ScoreDimensionKey } from '../../lib/constants'
import type { RiskCatalogEntry } from '../../types/database.types'
import { expColor, SourceBadge } from './riskLabels'

const treatmentLabel = (v: string): string => RISK_TREATMENTS.find((t) => t.value === v)?.label ?? v
const lifecycleLabel = (v: string): string => RISK_LIFECYCLE_STATUS.find((s) => s.value === v)?.label ?? v
const toAudited = (r: SupervisedRisk): AuditedScenario => ({
  id: r.id, title: r.title, dimension: r.dimension,
  inherent_likelihood: r.inherent_likelihood, inherent_impact: r.inherent_impact,
  threat_ref: r.threat_ref, feared_event_ref: r.feared_event_ref,
  vulnerability: r.vulnerability, asset_name: r.asset_name,
})

/** Drill-down : registre de risque d'UN assujetti supervisé + demande d'action. */
export function SupervisedOrgRisks({ org, onBack }: { org: PortfolioOrg; onBack: () => void }): JSX.Element {
  const { rows, loading, reload } = useSupervisedRisks(org.organization_id)
  const [catalog, setCatalog] = useState<RiskCatalogEntry[]>([])
  const [selected, setSelected] = useState<SupervisedRisk | null>(null)
  const [requestFor, setRequestFor] = useState<SupervisedRisk | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const dir = useSupervisorDirectives()
  const toast = useToast()
  const vocab = useVocab()

  useEffect(() => {
    const ac = new AbortController()
    void (async () => {
      const { data } = await supabase.from('risk_catalog').select('*').abortSignal(ac.signal)
      if (!ac.signal.aborted) setCatalog((data ?? []) as RiskCatalogEntry[])
    })()
    return () => ac.abort()
  }, [])

  const submitRequest = async (d: string): Promise<void> => {
    if (!requestFor || !d.trim()) return
    const res = await dir.request(requestFor.id, d.trim())
    if (res.ok) { toast.success(`Demande envoyée à l'${vocab.entitySingular}`); setRequestFor(null); reload() }
    else toast.error('Demande impossible', { description: res.error })
  }

  const createForOrg = async (s: NewScenario, orgId: string | null): Promise<string | null> => {
    const { data, error } = await supabase.rpc('create_supervised_scenario', {
      p_org: orgId ?? org.organization_id, p_title: s.title, p_dimension: s.dimension ?? '',
      p_likelihood: s.inherent_likelihood, p_impact: s.inherent_impact,
      p_vulnerability: s.vulnerability ?? null, p_treatment: s.treatment,
      p_threat_ref: s.threat_ref ?? null, p_feared_event_ref: s.feared_event_ref ?? null,
    })
    if (error) { toast.error('Création impossible', { description: error.message }); return null }
    reload()
    return data as string
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-800"><ArrowLeft size={15} /> Retour au portefeuille</button>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{org.org_name}</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">{org.sector ?? 'Secteur non renseigné'} · registre de risque de l&apos;{vocab.entitySingular} ; vous pouvez <b>créer un risque</b> et <b>demander des actions de traitement</b>.</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900"><Plus size={16} /> Nouveau risque</button>
      </div>

      {requestFor && <RequestActionPanel label={requestFor.title} dimension={requestFor.dimension} onSubmit={submitRequest} onCancel={() => setRequestFor(null)} />}

      {loading ? <LoadingSpinner /> : rows.length === 0 ? (
        <EmptyState title="Aucun risque" description={`${vocab.entityWithDem.charAt(0).toUpperCase()}${vocab.entityWithDem.slice(1)} n'a pas (encore) de scénario dans son registre.`} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Scénario</th>
                <th className="text-left px-4 py-3 font-semibold">Dimension</th>
                <th className="text-left px-4 py-3 font-semibold">Exposition</th>
                <th className="text-left px-4 py-3 font-semibold">Cycle de vie</th>
                <th className="text-left px-4 py-3 font-semibold">Traitement</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => {
                const exp = riskExposure(r.inherent_likelihood, r.inherent_impact)
                const dimColor = r.dimension ? SCORE_DIMENSION_COLORS[r.dimension as ScoreDimensionKey] : '#94A3B8'
                return (
                  <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(r)}>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-2"><span className="font-medium text-gray-900 hover:text-[#6D5AE6]">{r.title}</span><SourceBadge source={r.source} /></span>{r.asset_name && <span className="text-gray-400"> · {r.asset_name}</span>}</td>
                    <td className="px-4 py-3">{r.dimension && <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: `${dimColor}22`, color: dimColor }}>{SCORE_DIMENSION_LABELS[r.dimension as ScoreDimensionKey]}</span>}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: expColor(exp) }}>{exp}</td>
                    <td className="px-4 py-3"><span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-forest-50 text-forest-700 border border-forest-100">{lifecycleLabel(r.lifecycle_status)}</span></td>
                    <td className="px-4 py-3 text-gray-600">{treatmentLabel(r.treatment)}</td>
                    <td className="px-4 py-3 text-right"><button onClick={(e) => { e.stopPropagation(); setRequestFor(r) }} className="text-[12px] font-semibold text-forest-700 hover:underline whitespace-nowrap">Demander une action</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && <AuditedScenarioBowtie scenario={toAudited(selected)} catalog={catalog} onClose={() => setSelected(null)} />}
      {createOpen && <ScenarioFormModal catalog={catalog} orgs={[{ id: org.organization_id, name: org.org_name }]} onClose={() => setCreateOpen(false)} onCreate={createForOrg} />}
    </div>
  )
}
