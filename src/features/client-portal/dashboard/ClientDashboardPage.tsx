import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { useClientMissions } from '../useClientMissions'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { ClientMissionCard } from '../missions/ClientMissionCard'

interface DashboardKpis {
  activeMissions: number
  pendingDocs: number
  pendingValidations: number
  pendingActions: number
}

export function ClientDashboardPage(): JSX.Element {
  const { profile } = useAuth()
  const { missions, loading, error } = useClientMissions()
  const [kpis, setKpis] = useState<DashboardKpis>({ activeMissions: 0, pendingDocs: 0, pendingValidations: 0, pendingActions: 0 })

  const activeMissions = missions.filter((m) => m.status !== 'closed')
  const cabinets = [...new Set(missions.map((m) => m.cabinet_name).filter(Boolean))]

  useEffect(() => {
    const fetchKpis = async (): Promise<void> => {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token || missions.length === 0) return

      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = { 'apikey': apikey, 'Authorization': `Bearer ${token}` }
      const missionIds = missions.map((m) => m.id)
      const idsFilter = `in.(${missionIds.join(',')})`

      // Pending validations: assessments submitted but not yet validated by client
      let pendingValidations = 0
      const assessRes = await fetch(
        `${baseUrl}/rest/v1/control_assessments?mission_id=${idsFilter}&status=in.(submitted,in_review,approved)&select=id`,
        { headers }
      )
      if (assessRes.ok) {
        const assessments = await assessRes.json() as { id: string }[]
        if (assessments.length > 0) {
          const aIds = assessments.map((a) => a.id)
          const valRes = await fetch(
            `${baseUrl}/rest/v1/assessment_validations?assessment_id=in.(${aIds.join(',')})&stage=eq.client_review&select=assessment_id`,
            { headers }
          )
          const validated = valRes.ok ? await valRes.json() as { assessment_id: string }[] : []
          const validatedSet = new Set(validated.map((v) => v.assessment_id))
          pendingValidations = assessments.filter((a) => !validatedSet.has(a.id)).length
        }
      }

      // Pending actions
      let pendingActions = 0
      const actRes = await fetch(
        `${baseUrl}/rest/v1/client_action_items?mission_id=${idsFilter}&status=in.(open,in_progress)&select=id`,
        { headers }
      )
      if (actRes.ok) {
        const actions = await actRes.json() as { id: string }[]
        pendingActions = actions.length
      }

      setKpis({
        activeMissions: activeMissions.length,
        pendingDocs: 0,
        pendingValidations,
        pendingActions,
      })
    }

    fetchKpis()
  }, [missions, activeMissions.length])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">
        Bonjour, {profile?.first_name ?? 'Client'}
      </h1>
      <p className="text-sm text-gray-400 mb-6">
        {activeMissions.length} mission{activeMissions.length > 1 ? 's' : ''} en cours
        {cabinets.length > 1 ? ` avec ${cabinets.length} cabinets` : ''}
      </p>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <KpiCard label="Missions actives" value={kpis.activeMissions} color="text-forest-700" />
        <KpiCard label="Documents" value={kpis.pendingDocs} sub="en attente" color="text-gold-500" />
        <KpiCard label="Constats" value={kpis.pendingValidations} sub={'\u00e0 valider'} color="text-orange-500" />
        <KpiCard label="Actions" value={kpis.pendingActions} sub="en cours" color="text-purple-500" />
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Missions r&eacute;centes</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {activeMissions.slice(0, 4).map((m) => (
          <ClientMissionCard key={m.id} mission={m} />
        ))}
      </div>

      {activeMissions.length === 0 && (
        <div className="text-center py-16 text-gray-300 text-sm">Aucune mission en cours.</div>
      )}
    </div>
  )
}

function KpiCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }): JSX.Element {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-300 mt-0.5">{sub}</p>}
    </div>
  )
}
