import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, ClipboardList, Download, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { useRiskRegister, type ScenarioRow, type NewScenario } from './useRiskRegister'
import { useRiskCriteria } from './useRiskCriteria'
import { useSoA } from './useSoA'
import { useSupervisedPortfolio } from './useSupervisedPortfolio'
import { useEdition } from '../edition/EditionContext'
import { useVocab } from '../edition/useVocab'
import { ScenarioFormModal } from './ScenarioFormModal'
import { ScenarioDetail } from './ScenarioDetail'
import { SupervisedRegister } from './SupervisedRegister'
import { RiskScenarioTable } from './RiskScenarioTable'
import { RiskLegend } from './RiskLegend'
import { RiskGlossary } from './RiskGlossary'
import { treatmentLabel, lifecycleLabel } from './riskLabels'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { downloadCsv } from '../../lib/downloadCsv'
import { SCORE_DIMENSION_LABELS, RISK_CONTROL_LINK_KINDS } from '../../lib/constants'

const kindLabel = (v: string): string => RISK_CONTROL_LINK_KINDS.find((k) => k.value === v)?.label ?? v

/** Registre des scénarios de risque : propre à l'org, ou consolidé cross-org pour un superviseur. */
export function RiskRegisterPage(): JSX.Element {
  const reg = useRiskRegister()
  const crit = useRiskCriteria()
  const soa = useSoA()
  const { hasCapability } = useEdition()
  const vocab = useVocab()
  const supervises = hasCapability('supervision') || hasCapability('client_portal')
  const toast = useToast()
  const portfolio = useSupervisedPortfolio()
  const orgOptions = useMemo(() => portfolio.orgs.map((o) => ({ id: o.organization_id, name: o.org_name, sector: o.sector })).sort((a, b) => a.name.localeCompare(b.name)), [portfolio.orgs])
  const [scope, setScope] = useState<'own' | 'all'>('own')
  const [modal, setModal] = useState(false)
  const [supRefresh, setSupRefresh] = useState(0)
  const [detail, setDetail] = useState<ScenarioRow | null>(null)
  const [params, setParams] = useSearchParams()

  const createSupervised = async (s: NewScenario, orgId: string | null): Promise<string | null> => {
    if (!orgId) return null
    const { data, error } = await supabase.rpc('create_supervised_scenario', {
      p_org: orgId, p_title: s.title, p_dimension: s.dimension ?? '',
      p_likelihood: s.inherent_likelihood, p_impact: s.inherent_impact,
      p_vulnerability: s.vulnerability ?? null, p_treatment: s.treatment,
      p_threat_ref: s.threat_ref ?? null, p_feared_event_ref: s.feared_event_ref ?? null,
    })
    if (error) { console.error('[create_supervised_scenario]', error.message); toast.error('Création impossible'); return null }
    setSupRefresh((n) => n + 1)
    return data as string
  }

  const fv = Number(params.get('v')), fi = Number(params.get('i'))
  const cellFilter = fv >= 1 && fv <= 4 && fi >= 1 && fi <= 4
  const shown = cellFilter ? reg.scenarios.filter((s) => s.inherent_likelihood === fv && s.inherent_impact === fi) : reg.scenarios

  if (reg.loading) return <LoadingSpinner />
  if (reg.error) return <ErrorAlert message={reg.error} />

  const today = new Date().toISOString().slice(0, 10)
  const exportRegister = (): void => {
    const header = ['Titre', 'Dimension', 'Vraisemblance', 'Impact', 'Exposition', 'Cycle de vie', 'Traitement', 'Prochaine revue']
    const rows = reg.scenarios.map((s) => [
      s.title, s.dimension ? SCORE_DIMENSION_LABELS[s.dimension] : '',
      s.inherent_likelihood, s.inherent_impact, s.exposure,
      lifecycleLabel(s.lifecycle_status), treatmentLabel(s.treatment), s.next_review_at ?? '',
    ])
    downloadCsv(`registre-risques-${today}.csv`, [header, ...rows])
  }
  const exportSoA = (): void => {
    const header = ['Contrôle', 'Intitulé', 'Type de barrière', 'Risque traité', 'Justification d\'applicabilité']
    const rows = soa.rows.map((r) => [r.control_code, r.control_name, kindLabel(r.kind), r.scenario_title, r.justification ?? ''])
    downloadCsv(`soa-${today}.csv`, [header, ...rows])
  }
  const consolidated = supervises && scope === 'all'

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><ClipboardList size={20} className="text-[#E07A5F]" /> Registre des risques</h1>
          <p className="mt-1 text-[13px] text-gray-500">{consolidated ? `Risques de l'ensemble de vos ${vocab.entityPlural}. Cliquez un scénario pour le détail ; demandez une action de traitement.` : 'Scénarios ISO 27005 : cliquez un scénario pour ouvrir son nœud papillon.'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <RiskGlossary />
          {!consolidated && (
            <>
              <button onClick={exportRegister} disabled={reg.scenarios.length === 0} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"><Download size={15} /> Registre</button>
              <button onClick={exportSoA} disabled={soa.rows.length === 0} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"><Download size={15} /> SoA</button>
            </>
          )}
          <button onClick={() => setModal(true)} disabled={consolidated && orgOptions.length === 0} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50"><Plus size={16} /> Nouveau risque</button>
        </div>
      </div>

      {supervises && (
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-[13px] font-semibold">
          <button onClick={() => setScope('own')} className={`px-3 py-1.5 ${!consolidated ? 'bg-forest-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Mon organisation</button>
          <button onClick={() => setScope('all')} className={`px-3 py-1.5 border-l border-gray-200 ${consolidated ? 'bg-forest-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Tous les {vocab.entityPlural}</button>
        </div>
      )}

      {!consolidated && cellFilter && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[12px] text-gray-700">
            Vraisemblance {fv} · Impact {fi}
            <button onClick={() => { params.delete('v'); params.delete('i'); setParams(params, { replace: true }) }} className="rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700" title="Retirer le filtre"><X size={13} /></button>
          </span>
          <span className="text-[12px] text-gray-400">{shown.length} risque{shown.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {consolidated ? (
        <SupervisedRegister key={supRefresh} catalog={reg.catalog} />
      ) : reg.scenarios.length === 0 ? (
        <EmptyState title="Registre vide" description="Créez votre premier risque avec le bouton ci-dessus." action={<button onClick={() => setModal(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900"><Plus size={15} /> Nouveau risque</button>} />
      ) : shown.length === 0 ? (
        <EmptyState title="Aucun risque pour ce couple" description={`Aucun scénario avec vraisemblance ${fv} et impact ${fi}.`} />
      ) : (
        <RiskScenarioTable rows={shown} threshold={crit.acceptanceThreshold} isAboveThreshold={crit.isAboveThreshold} onOpen={setDetail} onDelete={reg.deleteScenario} />
      )}

      <RiskLegend />

      {modal && (consolidated
        ? <ScenarioFormModal catalog={reg.catalog} orgs={orgOptions} onClose={() => setModal(false)} onCreate={createSupervised} />
        : <ScenarioFormModal catalog={reg.catalog} onClose={() => setModal(false)} onCreate={reg.createScenario} />)}
      {detail && <ScenarioDetail scenario={detail} catalog={reg.catalog} onClose={() => setDetail(null)} />}
    </div>
  )
}
