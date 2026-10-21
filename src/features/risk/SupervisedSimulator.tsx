import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useSupervisedRegister } from './useSupervisedPortfolio'
import { useSupervisorDirectives } from './useSupervisorDirectives'
import { useVocab } from '../edition/useVocab'
import { useToast } from '../../hooks/useToast'
import { SimulatorPanel, type BarrierLike } from './SimulatorPanel'
import { incidentSeverityBump, DEFAULT_ACCEPTANCE_THRESHOLD, type RiskControlLinkKind } from '../../lib/constants'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'

interface Bowtie {
  barriers: { kind: string; effectiveness: number; code: string }[]
  policyBarriers: { kind: string; effectiveness: number; title: string }[]
  incidents: { id: string; severity: string }[]
  scenarioIncidentIds: string[]
}

/** Simulateur « et si » sur un risque d'assujetti (#7) : barrières réelles via
 *  get_supervised_scenario_bowtie, puis « Demander une action » (directive). */
export function SupervisedSimulator(): JSX.Element {
  const { rows, loading } = useSupervisedRegister()
  const dir = useSupervisorDirectives()
  const vocab = useVocab()
  const toast = useToast()
  const [sel, setSel] = useState('')
  const [bowtie, setBowtie] = useState<Bowtie | null>(null)
  const [loadingBt, setLoadingBt] = useState(false)

  const scenarioId = sel || rows[0]?.id || ''
  const scenario = rows.find((r) => r.id === scenarioId) ?? null

  useEffect(() => {
    if (!scenarioId) { setBowtie(null); return }
    const ac = new AbortController()
    setLoadingBt(true)
    void (async () => {
      const { data, error } = await supabase.rpc('get_supervised_scenario_bowtie', { p_scenario_id: scenarioId }).abortSignal(ac.signal)
      if (ac.signal.aborted) return
      setLoadingBt(false)
      if (error) { console.error('[SupervisedSimulator]', error.message); setBowtie(null); return }
      setBowtie((data ?? null) as Bowtie | null)
    })()
    return () => ac.abort()
  }, [scenarioId])

  const base = useMemo<BarrierLike[]>(() => bowtie ? [
    ...(bowtie.barriers ?? []).map((b) => ({ kind: b.kind as RiskControlLinkKind, effectiveness: b.effectiveness, label: b.code })),
    ...(bowtie.policyBarriers ?? []).map((b) => ({ kind: b.kind as RiskControlLinkKind, effectiveness: b.effectiveness, label: b.title })),
  ] : [], [bowtie])

  const bump = useMemo(() => {
    if (!bowtie) return 0
    const ids = new Set(bowtie.scenarioIncidentIds ?? [])
    return (bowtie.incidents ?? []).filter((i) => ids.has(i.id)).reduce((m, i) => Math.max(m, incidentSeverityBump(i.severity)), 0)
  }, [bowtie])

  const commit = async (labels: string[]): Promise<boolean> => {
    if (!scenario) return false
    const res = await Promise.all(labels.map((l) => dir.request(scenario.id, l)))
    const ok = res.every((r) => r.ok)
    if (ok) toast.success(`${labels.length} demande(s) envoyée(s) à l'${vocab.entitySingular}`)
    else toast.error('Demande partielle ou impossible')
    return ok
  }

  if (loading) return <LoadingSpinner />
  if (rows.length === 0) return <EmptyState title="Aucun risque supervisé" description={`Vous ne supervisez pas (encore) de ${vocab.entitySingular} ayant des risques.`} />

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[12px] font-medium text-gray-600 mb-1">Risque de l&apos;{vocab.entitySingular}</label>
        <select value={scenarioId} onChange={(e) => setSel(e.target.value)} className="w-full max-w-xl px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700">
          {rows.map((r) => <option key={r.id} value={r.id}>{r.org_name} · {r.title}</option>)}
        </select>
      </div>
      {loadingBt ? <LoadingSpinner /> : scenario && (
        <>
          <SimulatorPanel scenario={scenario} base={base} bump={bump} threshold={DEFAULT_ACCEPTANCE_THRESHOLD} commitLabel="Demander une action" busyLabel="Envoi..." onCommit={commit} />
          <p className="text-[11.5px] text-gray-400">Projection indicative à partir des barrières connues de l&apos;assujetti. Les mesures retenues sont envoyées comme demandes d&apos;action.</p>
        </>
      )}
    </div>
  )
}
