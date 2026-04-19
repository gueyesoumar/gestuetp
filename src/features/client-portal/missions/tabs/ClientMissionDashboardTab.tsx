import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import type { ClientMissionDetail } from '../useClientMissionDetail'

interface Props {
  mission: ClientMissionDetail
}

interface TeamMember {
  id: string
  first_name: string
  last_name: string
  job_title: string | null
  role_label: string
}

const PHASES = [
  { key: 'scoping', label: 'Cadrage' },
  { key: 'planning', label: 'Planification' },
  { key: 'fieldwork', label: 'Travaux terrain' },
  { key: 'internal_review', label: 'Revue interne' },
  { key: 'client_review', label: 'Validation client' },
  { key: 'closure', label: 'Restitution' },
]

const PHASE_ORDER = ['scoping', 'planning', 'fieldwork', 'internal_review', 'client_review', 'closure']

export function ClientMissionDashboardTab({ mission }: Props): JSX.Element {
  const currentIdx = PHASE_ORDER.indexOf(mission.status)
  const [team, setTeam] = useState<TeamMember[]>([])

  useEffect(() => {
    const fetchTeam = async (): Promise<void> => {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) return

      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = { 'apikey': apikey, 'Authorization': `Bearer ${token}` }

      const res = await fetch(
        `${baseUrl}/rest/v1/mission_members?mission_id=eq.${mission.id}&select=role,user:users(id,first_name,last_name,job_title)`,
        { headers }
      )

      if (!res.ok) return

      const data = await res.json() as { role: string; user: { id: string; first_name: string; last_name: string; job_title: string | null } }[]
      const roleLabels: Record<string, string> = {
        associate: 'Associ\u00e9',
        lead_auditor: 'Chef de mission',
        auditor: 'Auditeur',
      }

      setTeam(data.map((m) => ({
        id: m.user.id,
        first_name: m.user.first_name,
        last_name: m.user.last_name,
        job_title: m.user.job_title,
        role_label: roleLabels[m.role] ?? m.role,
      })))
    }

    fetchTeam()
  }, [mission.id])

  return (
    <div className="flex gap-4">
      {/* Timeline */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-bold mb-4">Timeline de la mission</p>
        <div className="relative pl-5">
          <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-gray-200" />
          {PHASES.map((phase, i) => {
            const isDone = i < currentIdx
            const isActive = i === currentIdx
            return (
              <div key={phase.key} className={`relative mb-4 last:mb-0 ${!isDone && !isActive ? 'opacity-40' : ''}`}>
                <div className={`absolute -left-5 top-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                  isDone ? 'bg-green-500 border-green-500' :
                  isActive ? 'bg-forest-500 border-forest-700' :
                  'bg-white border-gray-300'
                }`} />
                <div className={isActive ? 'bg-forest-50 -mx-2 px-2 py-1.5 rounded-lg border border-forest-100' : ''}>
                  <p className={`text-xs font-semibold ${isActive ? 'text-forest-900' : 'text-gray-700'}`}>
                    {phase.label}
                  </p>
                  {isDone && <p className="text-[10px] text-green-500">Termin&eacute;</p>}
                  {isActive && <p className="text-[10px] text-forest-700 font-medium">En cours</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right column */}
      <div className="w-72 shrink-0 space-y-3">
        {/* Next actions */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-bold mb-3">Prochaines &eacute;ch&eacute;ances</p>
          <div className="text-xs text-gray-400 text-center py-4">
            Les &eacute;ch&eacute;ances appara&icirc;tront ici
          </div>
        </div>

        {/* Team */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-bold mb-3">&Eacute;quipe d&rsquo;audit</p>
          {team.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-4">
              Aucun membre visible
            </div>
          ) : (
            <div className="space-y-2">
              {team.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-forest-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {m.first_name.charAt(0)}{m.last_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{m.first_name} {m.last_name}</p>
                    <p className="text-[10px] text-gray-300">{m.role_label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
