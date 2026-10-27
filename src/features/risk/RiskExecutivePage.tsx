import { useMemo } from 'react'
import { useSupervisedPortfolio } from './useSupervisedPortfolio'
import { useSupervisedRegister } from './useSupervisedPortfolio'
import { useSupervisorDirectives } from './useSupervisorDirectives'
import { exposureScore, postureLabel, topThreats } from './execSynthesis'
import { RiskSectorRadar } from './RiskSectorRadar'
import { ExecExposure } from './ExecExposure'
import { ExecThreats } from './ExecThreats'
import { ExecDecisions } from './ExecDecisions'
import { ExecVitalsSectors } from './ExecVitalsSectors'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { EmptyState } from '../../components/ui/EmptyState'

/** Synthèse exécutive (RFC 0018 Lot C) : lecture dirigeant de la situation cyber nationale. */
export function RiskExecutivePage(): JSX.Element {
  const { orgs, loading, error } = useSupervisedPortfolio()
  const { rows } = useSupervisedRegister()
  const { rows: directives } = useSupervisorDirectives()

  const exposure = useMemo(() => exposureScore(orgs), [orgs])
  const threats = useMemo(() => topThreats(rows, 5), [rows])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  const vitals = orgs.filter((o) => o.is_iic)
  const vitalsAtRisk = vitals.filter((o) => o.above_threshold > 0).length
  const aboveTotal = orgs.reduce((s, o) => s + o.above_threshold, 0)
  const overdue = orgs.reduce((s, o) => s + o.overdue_reviews, 0)
  const lateDirectives = directives.filter((d) => d.verification_status === 'pending' && d.due_date && d.due_date < new Date().toISOString().slice(0, 10)).length
  const posture = postureLabel(exposure)

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-[2px] font-bold text-[#9C7A1F]">Sécurité des systèmes d&apos;information de l&apos;État</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Situation cyber nationale</h1>
        <p className="mt-1 text-[13px] text-gray-500">Vue d&apos;ensemble pour la décision · {orgs.length} institutions suivies.</p>
      </div>

      {orgs.length === 0 ? (
        <EmptyState title="Aucune institution supervisée" description="Vous n'avez pas encore d'organisation sous supervision à synthétiser." />
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white border-l-4 border-l-[#D4A843] px-4 py-4">
            <p className="text-[15.5px] text-gray-900 leading-snug"><b>{vitalsAtRisk} des {vitals.length} infrastructures vitales de l&apos;État</b> présentent un risque cyber élevé. Des décisions attendent votre arbitrage pour protéger l&apos;eau, l&apos;électricité, les finances et la souveraineté numérique.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi value={`${exposure}`} suffix="/100" label="Niveau d'exposition" tone={exposure >= 55 ? 'text-red-600' : 'text-gray-900'} />
            <Kpi value={`${vitalsAtRisk}`} suffix={`/${vitals.length}`} label="Vitales à risque" tone="text-red-600" />
            <Kpi value={`${aboveTotal}`} label="Risques hors seuil" tone={aboveTotal > 0 ? 'text-red-600' : 'text-gray-900'} />
            <Kpi value={`${lateDirectives + overdue}`} label="Décisions en attente" tone="text-amber-600" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Radar des institutions</h3>
              <RiskSectorRadar orgs={orgs} />
            </div>
            <ExecExposure exposure={exposure} posture={posture} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr] items-start">
            <ExecThreats threats={threats} />
            <ExecDecisions directives={directives} overdueReviews={overdue} />
          </div>

          <ExecVitalsSectors orgs={orgs} />
          <p className="text-[11px] text-gray-400">Vue de synthèse. Chaque chiffre peut être détaillé sur demande.</p>
        </>
      )}
    </div>
  )
}

function Kpi({ value, suffix, label, tone }: { value: string; suffix?: string; label: string; tone: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className={`text-2xl font-bold font-mono ${tone}`}>{value}{suffix && <span className="text-[15px] text-gray-400">{suffix}</span>}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
