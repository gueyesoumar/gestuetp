import { Briefcase, Calendar, Building, User, Users } from 'lucide-react'
import type { MissionDetail } from '../../useMissionDetail'

interface MissionInfoTabProps {
  mission: MissionDetail
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fullName(u: { first_name?: string | null; last_name?: string | null; email?: string | null } | null | undefined): string {
  if (!u) return '—'
  const parts = [u.first_name, u.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : (u.email ?? '—')
}

export function MissionInfoTab({ mission }: MissionInfoTabProps) {
  return (
    <div className="p-3 space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">Mission</p>
        <p className="text-[13px] font-semibold text-gray-900">{mission.name}</p>
      </div>

      <Row icon={<Briefcase size={11} />} label="Référentiel">
        {mission.framework?.name ?? '—'}
      </Row>

      <Row icon={<Building size={11} />} label="Client">
        {mission.client?.name ?? '—'}
      </Row>

      <Row icon={<Calendar size={11} />} label="Période">
        Du {formatDate(mission.start_date)} au {formatDate(mission.end_date)}
      </Row>

      <Row icon={<User size={11} />} label="Chef de mission">
        {fullName(mission.lead_auditor_user as { first_name?: string | null; last_name?: string | null; email?: string | null } | null)}
      </Row>

      <Row icon={<Users size={11} />} label="Associé">
        {fullName(mission.associate_user as { first_name?: string | null; last_name?: string | null; email?: string | null } | null)}
      </Row>
    </div>
  )
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span className="text-gray-400 shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-wider font-bold text-gray-400">{label}</p>
        <p className="text-[12px] text-gray-700 mt-0.5">{children}</p>
      </div>
    </div>
  )
}
