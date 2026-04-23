import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  roleLabel: string
  roleKey: string
}

const ROLE_LABELS: Record<string, string> = {
  associate: 'Associ\u00e9',
  lead_auditor: 'Chef de mission',
  auditor: 'Auditeur',
}

const ROLE_COLORS: Record<string, string> = {
  associate: 'bg-gray-500',
  lead_auditor: 'bg-forest-700',
  auditor: 'bg-forest-500',
}

interface ClientTeamCardProps {
  missionId: string
}

export function ClientTeamCard({ missionId }: ClientTeamCardProps): JSX.Element {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    const fetchTeam = async (): Promise<void> => {
      setLoading(true)
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) { setLoading(false); return }

      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(
        `${baseUrl}/rest/v1/mission_members?mission_id=eq.${missionId}&select=role,user:users(id,first_name,last_name)`,
        {
          headers: { 'apikey': apikey, 'Authorization': `Bearer ${token}` },
          signal: controller.signal,
        }
      )

      if (controller.signal.aborted) return
      if (!res.ok) { setLoading(false); return }

      const data = await res.json() as { role: string; user: { id: string; first_name: string; last_name: string } }[]

      // Sort: associate first, then lead, then auditors
      const order: Record<string, number> = { associate: 0, lead_auditor: 1, auditor: 2 }
      const sorted = data.sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9))

      setTeam(sorted.map((m) => ({
        id: m.user.id,
        firstName: m.user.first_name,
        lastName: m.user.last_name,
        roleLabel: ROLE_LABELS[m.role] ?? m.role,
        roleKey: m.role,
      })))
      setLoading(false)
    }

    fetchTeam()
    return () => controller.abort()
  }, [missionId])

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users size={15} className="text-gray-400" />
        <span className="text-[13px] font-semibold text-gray-700">{'\u00c9'}quipe d{'\u2019'}audit</span>
      </div>
      {loading ? (
        <p className="text-xs text-gray-300 text-center py-4">Chargement...</p>
      ) : team.length === 0 ? (
        <p className="text-xs text-gray-300 text-center py-4">Aucun membre visible</p>
      ) : (
        <div className="flex flex-col gap-3">
          {team.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full ${ROLE_COLORS[m.roleKey] ?? 'bg-gray-400'} text-white flex items-center justify-center text-[11px] font-semibold shrink-0`}>
                {m.firstName.charAt(0)}{m.lastName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-gray-900 truncate">{m.firstName} {m.lastName}</p>
                <p className="text-[11px] text-gray-400">{m.roleLabel}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
