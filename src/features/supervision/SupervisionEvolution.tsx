import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { EntityScore } from './useSupervisionData'

interface SupervisionEvolutionProps {
  entities: EntityScore[]
}

interface CampaignPeriod {
  id: string
  name: string
  periodLabel: string
  avgScore: number
  entityCount: number
}

export function SupervisionEvolution({ entities }: SupervisionEvolutionProps): JSX.Element {
  const { profile } = useAuth()
  const [periods, setPeriods] = useState<CampaignPeriod[]>([])
  const [loading, setLoading] = useState(true)

  const currentAvg = entities.length > 0
    ? Math.round(entities.reduce((s, e) => s + e.globalScore, 0) / entities.length)
    : 0

  useEffect(() => {
    if (!profile?.organization_id) { setLoading(false); return }
    const controller = new AbortController()

    const fetchCampaigns = async (): Promise<void> => {
      setLoading(true)

      // Fetch completed campaigns
      const { data: camps } = await supabase
        .from('audit_campaigns')
        .select('id, name, period_label, status')
        .eq('organization_id', profile.organization_id)
        .in('status', ['active', 'completed'])
        .order('period_start', { ascending: true })
        .abortSignal(controller.signal)

      if (controller.signal.aborted) return
      if (!camps || camps.length === 0) { setPeriods([]); setLoading(false); return }

      // Fetch missions + assessments for each campaign
      const campIds = camps.map((c) => c.id)
      const { data: missions } = await supabase
        .from('missions')
        .select('id, campaign_id, client_id')
        .in('campaign_id', campIds)
        .abortSignal(controller.signal)

      if (controller.signal.aborted) return

      const missionIds = (missions ?? []).map((m) => m.id)
      let scoresByMission = new Map<string, number>()

      if (missionIds.length > 0) {
        const { data: assessments } = await supabase
          .from('control_assessments')
          .select('mission_id, status')
          .in('mission_id', missionIds)
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return

        const totals = new Map<string, { total: number; approved: number }>()
        for (const a of assessments ?? []) {
          const entry = totals.get(a.mission_id) ?? { total: 0, approved: 0 }
          entry.total++
          if (a.status === 'approved') entry.approved++
          totals.set(a.mission_id, entry)
        }
        for (const [mid, { total, approved }] of totals) {
          scoresByMission.set(mid, total > 0 ? Math.round((approved / total) * 100) : 0)
        }
      }

      // Build periods
      const result: CampaignPeriod[] = camps.map((c) => {
        const campMissions = (missions ?? []).filter((m) => m.campaign_id === c.id)
        const scores = campMissions
          .map((m) => scoresByMission.get(m.id))
          .filter((s): s is number => s !== undefined)
        const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

        return {
          id: c.id,
          name: c.name,
          periodLabel: c.period_label,
          avgScore: avg,
          entityCount: new Set(campMissions.map((m) => m.client_id)).size,
        }
      })

      setPeriods(result)
      setLoading(false)
    }

    fetchCampaigns()
    return () => controller.abort()
  }, [profile?.organization_id])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-[14px] font-bold text-gray-900 mb-4">
        {'\u00c9'}volution de la conformit{'\u00e9'}
      </h3>

      {/* Period bars */}
      <div className="space-y-3 mb-8">
        {loading ? (
          <p className="text-xs text-gray-400">Chargement...</p>
        ) : periods.length === 0 ? (
          <>
            <PeriodBar label="P\u00e9riode actuelle" score={currentAvg} count={entities.length} active />
            <p className="text-[12px] text-gray-400 italic mt-4">
              L{'\u2019'}{'\u00e9'}volution historique sera disponible d{'\u00e8'}s que des campagnes d{'\u2019'}audit seront termin{'\u00e9'}es.
            </p>
          </>
        ) : (
          <>
            {periods.map((p, i) => {
              const prevScore = i > 0 ? periods[i - 1].avgScore : null
              const delta = prevScore !== null ? p.avgScore - prevScore : null
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <PeriodBar label={p.periodLabel} score={p.avgScore} count={p.entityCount} />
                  {delta !== null && (
                    <DeltaBadge delta={delta} />
                  )}
                </div>
              )
            })}
            {/* Current period (from live data) */}
            <PeriodBar label="En cours" score={currentAvg} count={entities.length} active />
            {periods.length > 0 && (
              <div className="flex items-center gap-3 ml-[124px]">
                <DeltaBadge delta={currentAvg - periods[periods.length - 1].avgScore} />
                <span className="text-[10px] text-gray-300">vs {periods[periods.length - 1].periodLabel}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Per-entity progression */}
      <h4 className="text-[13px] font-bold text-gray-900 mb-3">Score par entit{'\u00e9'}</h4>
      {entities.length === 0 ? (
        <p className="text-sm text-gray-400">Aucune entit{'\u00e9'} audit{'\u00e9'}e.</p>
      ) : (
        <div className="space-y-2.5">
          {entities.map((entity) => (
            <div key={entity.clientId} className="flex items-center gap-3 text-[12px]">
              <span className="w-[200px] font-medium text-gray-900 truncate">{entity.clientName}</span>
              <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    entity.globalScore >= 80 ? 'bg-emerald-500' : entity.globalScore >= 60 ? 'bg-amber-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${entity.globalScore}%` }}
                />
              </div>
              <span className={`font-bold w-[45px] text-right ${
                entity.globalScore >= 80 ? 'text-emerald-700' : entity.globalScore >= 60 ? 'text-gold-500' : 'text-red-600'
              }`}>
                {entity.globalScore}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PeriodBar({ label, score, count, active }: { label: string; score: number; count: number; active?: boolean }): JSX.Element {
  const barColor = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-gold-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-4 flex-1">
      <span className={`text-[12px] w-[120px] text-right font-medium ${active ? 'text-forest-700' : 'text-gray-500'}`}>{label}</span>
      <div className="flex-1 h-7 rounded-lg bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-lg flex items-center pl-3 ${barColor}`} style={{ width: `${Math.max(score, 5)}%` }}>
          <span className="text-[11px] text-white font-bold">{score}%</span>
        </div>
      </div>
      <span className="text-[11px] text-gray-400 w-[80px]">{count} entit{'\u00e9'}{count !== 1 ? 's' : ''}</span>
      {active && <TrendingUp size={14} className="text-emerald-500" />}
    </div>
  )
}

function DeltaBadge({ delta }: { delta: number }): JSX.Element {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
        <TrendingUp size={10} />+{delta}%
      </span>
    )
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
        <TrendingDown size={10} />{delta}%
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">
      <Minus size={10} />0%
    </span>
  )
}
