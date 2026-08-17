import { Link } from 'react-router-dom'
import { ShieldAlert, Info, ArrowRight } from 'lucide-react'
import { useRiskRegister } from './useRiskRegister'
import { useSelfDimensionScores } from '../hub/useSelfDimensionScores'
import { RiskMatrix } from './RiskMatrix'
import { RiskRadar } from './RiskRadar'
import { RiskSimulator } from './RiskSimulator'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'

/** Vue d'ensemble du module Risk : maîtrise du risque, KPIs, radar, carte, simulateur. */
export function RiskPage(): JSX.Element {
  const reg = useRiskRegister()
  const score = useSelfDimensionScores()

  if (reg.loading) return <LoadingSpinner />
  if (reg.error) return <ErrorAlert message={reg.error} />

  const avgExposure = reg.scenarios.length ? Math.round(reg.scenarios.reduce((s, r) => s + r.exposure, 0) / reg.scenarios.length) : 0
  const mastery = score.riskMastery

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><ShieldAlert size={20} className="text-[#E07A5F]" /> Vue d&apos;ensemble</h1>
          <p className="mt-1 text-[13px] text-gray-500">L&apos;exposition aux risques (EBIOS RM) qui alimente votre score de confiance.</p>
        </div>
        <Link to="/risque/registre" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-forest-700 border border-forest-200 rounded-lg hover:bg-forest-50">
          Ouvrir le registre <ArrowRight size={16} />
        </Link>
      </div>

      {/* Bandeau maîtrise du risque + impact score */}
      <div className="rounded-xl border border-[#E07A5F]/30 bg-[#E07A5F]/[0.06] px-4 py-3 flex items-center gap-3 flex-wrap">
        <Info size={15} className="text-[#B34A31] shrink-0" />
        {mastery ? (
          <p className="text-[13px] text-gray-700">
            Maîtrise du risque&nbsp;: <b>{mastery.score}/100</b>. {score.composite === null
              ? <>Le score composite n&eacute;cessite d&apos;abord une <b>posture Comply</b> (des audits) pour que le risque puisse s&apos;y appliquer.</>
              : score.riskImpactActive
                ? <>Ce facteur <b>p&egrave;se</b> sur le score (−{mastery.penaltyPts} pts) → confiance <b>{score.composite}</b>.</>
                : <>Mode <b>shadow</b>&nbsp;: −{mastery.penaltyPts} pts <i>si activ&eacute;</i> (score actuel <b>{score.composite}</b>, inchang&eacute;).</>}
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

      <RiskSimulator score={score} />
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
