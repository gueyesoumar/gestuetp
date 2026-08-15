import { useState } from 'react'
import { Plus, Trash2, ShieldAlert, Info } from 'lucide-react'
import { useRiskRegister } from './useRiskRegister'
import { useSelfDimensionScores } from '../hub/useSelfDimensionScores'
import { RiskMatrix } from './RiskMatrix'
import { RiskRadar } from './RiskRadar'
import { ScenarioFormModal } from './ScenarioFormModal'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { SCORE_DIMENSION_LABELS, SCORE_DIMENSION_COLORS, RISK_TREATMENTS } from '../../lib/constants'

const treatmentLabel = (v: string): string => RISK_TREATMENTS.find((t) => t.value === v)?.label ?? v

export function RiskPage(): JSX.Element {
  const reg = useRiskRegister()
  const score = useSelfDimensionScores()
  const [modal, setModal] = useState(false)

  if (reg.loading) return <LoadingSpinner />
  if (reg.error) return <ErrorAlert message={reg.error} />

  const avgExposure = reg.scenarios.length ? Math.round(reg.scenarios.reduce((s, r) => s + r.exposure, 0) / reg.scenarios.length) : 0
  const mastery = score.riskMastery

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><ShieldAlert size={20} className="text-[#E07A5F]" /> Gëstu Risk</h1>
          <p className="mt-1 text-[13px] text-gray-500">Registre des risques (EBIOS RM) — l&apos;exposition qui alimente votre score de confiance.</p>
        </div>
        <button onClick={() => setModal(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900">
          <Plus size={16} /> Nouveau scénario
        </button>
      </div>

      {/* Bandeau maîtrise du risque + impact score */}
      <div className="rounded-xl border border-[#E07A5F]/30 bg-[#E07A5F]/[0.06] px-4 py-3 flex items-center gap-3 flex-wrap">
        <Info size={15} className="text-[#B34A31] shrink-0" />
        {mastery ? (
          <p className="text-[13px] text-gray-700">
            Maîtrise du risque&nbsp;: <b>{mastery.score}/100</b>. {score.riskImpactActive
              ? <>Ce facteur <b>pèse</b> sur le score (−{mastery.penaltyPts} pts) → confiance <b>{score.composite ?? '—'}</b>.</>
              : <>Mode <b>shadow</b>&nbsp;: −{mastery.penaltyPts} pts <i>si activé</i> (score actuel <b>{score.composite ?? '—'}</b>, inchangé).</>}
          </p>
        ) : (
          <p className="text-[13px] text-gray-600">Aucun scénario coté pour l&apos;instant — le score de confiance n&apos;est pas affecté.</p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi value={reg.scenarios.length} label="Scénarios" />
        <Kpi value={`${avgExposure}/100`} label="Exposition moyenne" tone={avgExposure >= 60 ? 'text-red-600' : avgExposure >= 30 ? 'text-amber-600' : 'text-forest-700'} />
        <Kpi value={mastery ? `${mastery.score}/100` : '—'} label="Maîtrise du risque" />
        <Kpi value={score.composite ?? '—'} label="Confiance (composite)" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Radar tri-couche</h3>
          <p className="text-[11px] text-gray-400 mb-2">Exposition inhérente (halo) · posture (trait) · résiduel (rempli)</p>
          <RiskRadar data={score} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Carte de risque</h3>
          {reg.scenarios.length === 0
            ? <p className="text-[13px] text-gray-400 py-8 text-center">Ajoutez un scénario pour le voir apparaître.</p>
            : <RiskMatrix scenarios={reg.scenarios} />}
        </div>
      </div>

      {/* Registre */}
      {reg.scenarios.length === 0 ? (
        <EmptyState title="Registre vide" description="Créez votre premier scénario de risque avec le bouton ci-dessus." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Scénario</th>
                <th className="text-left px-4 py-3 font-semibold">Dimension</th>
                <th className="text-left px-4 py-3 font-semibold">Cotation</th>
                <th className="text-left px-4 py-3 font-semibold">Exposition</th>
                <th className="text-left px-4 py-3 font-semibold">Traitement</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reg.scenarios.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.title}{s.asset_name && <span className="text-gray-400 font-normal"> · {s.asset_name}</span>}</td>
                  <td className="px-4 py-3">
                    {s.dimension && <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: `${SCORE_DIMENSION_COLORS[s.dimension]}22`, color: SCORE_DIMENSION_COLORS[s.dimension] }}>{SCORE_DIMENSION_LABELS[s.dimension]}</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-500">V{s.inherent_likelihood}·I{s.inherent_impact}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: s.exposure >= 60 ? '#C0392B' : s.exposure >= 30 ? '#B8860B' : '#27AE60' }}>{s.exposure}</td>
                  <td className="px-4 py-3 text-gray-600">{treatmentLabel(s.treatment)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => void reg.deleteScenario(s.id)} className="text-gray-400 hover:text-red-600" aria-label="Supprimer"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <ScenarioFormModal catalog={reg.catalog} onClose={() => setModal(false)} onCreate={reg.createScenario} />}
    </div>
  )
}

function Kpi({ value, label, tone }: { value: string | number; label: string; tone?: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className={`text-2xl font-bold ${tone ?? 'text-gray-900'}`}>{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  )
}
