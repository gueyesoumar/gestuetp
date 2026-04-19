import { useNavigate } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import type { MissionWithDetails } from '../useMissions'
import type { MissionStatus } from '../../../types/database.types'

interface MissionsKanbanViewProps {
  missions: MissionWithDetails[]
}

const columns: { status: MissionStatus[]; label: string; color: string; barColor: string }[] = [
  { status: ['initialization', 'scoping'], label: 'Cadrage', color: 'text-gray-400', barColor: 'bg-gray-300' },
  { status: ['planning'], label: 'Planification', color: 'text-forest-700', barColor: 'bg-forest-300' },
  { status: ['fieldwork'], label: 'Travaux', color: 'text-forest-700', barColor: 'bg-forest-500' },
  { status: ['internal_review'], label: 'Revue', color: 'text-gold-600', barColor: 'bg-gold-500' },
  { status: ['client_review'], label: 'Client', color: 'text-forest-500', barColor: 'bg-forest-300' },
  { status: ['closure'], label: 'Clôturées', color: 'text-success', barColor: 'bg-success' },
]

const fwIcons: Record<string, { abbr: string; bg: string }> = {
  'ISO/IEC 27001': { abbr: 'ISO', bg: 'bg-forest-100 text-forest-700' },
  'NIST Cybersecurity Framework': { abbr: 'NIST', bg: 'bg-blue-100 text-blue-700' },
  'COBIT': { abbr: 'COB', bg: 'bg-gold-200 text-gold-600' },
  'ITIL': { abbr: 'ITIL', bg: 'bg-indigo-100 text-indigo-700' },
  'Audit SI': { abbr: 'Gë', bg: 'bg-forest-900 text-gold-500' },
  'Due Diligence Technique': { abbr: 'Gë', bg: 'bg-forest-900 text-gold-500' },
  'Maturité Digitale': { abbr: 'Gë', bg: 'bg-forest-900 text-gold-500' },
}

export function MissionsKanbanView({ missions }: MissionsKanbanViewProps) {
  const navigate = useNavigate()

  return (
    <div className="flex gap-3.5 overflow-x-auto pb-4">
      {columns.map((col) => {
        const colMissions = missions.filter((m) => col.status.includes(m.status))
        const isClosed = col.status.includes('closure')

        return (
          <div key={col.label} className="min-w-[250px] flex-1">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className={`text-[12px] font-semibold uppercase tracking-wide ${col.color}`}>{col.label}</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
                {colMissions.length}
              </span>
            </div>
            <div className={`h-[3px] rounded-full mb-3 ${col.barColor}`} />

            <div className="space-y-2.5">
              {colMissions.map((mission) => {
                const fw = fwIcons[mission.framework?.name ?? ''] ?? { abbr: '?', bg: 'bg-gray-100 text-gray-600' }
                const leadInitials = mission.lead_auditor
                  ? `${mission.lead_auditor.first_name.charAt(0)}${mission.lead_auditor.last_name.charAt(0)}`
                  : null

                return (
                  <div
                    key={mission.id}
                    onClick={() => navigate(`/missions/${mission.id}`)}
                    className={`rounded-xl border border-gray-200 bg-white p-3.5 cursor-pointer transition-all hover:shadow-md hover:border-forest-300 ${isClosed ? 'opacity-65' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-[13px] font-semibold text-gray-900 leading-tight">{mission.name}</span>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-md text-[8px] font-extrabold flex-shrink-0 ml-2 ${fw.bg}`}>{fw.abbr}</span>
                    </div>
                    <div className="text-[11px] text-gray-300 mt-1">{mission.client?.name}</div>

                    {mission.scorePct !== null && (
                      <div className={`mt-2 text-[15px] font-bold ${
                        mission.scorePct >= 80 ? 'text-success' : mission.scorePct >= 60 ? 'text-forest-700' : 'text-gold-600'
                      }`}>
                        {mission.scorePct}%
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1 w-12 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isClosed ? 'bg-success' : 'bg-forest-500'}`}
                            style={{ width: `${mission.progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">{mission.progressPct}%</span>
                      </div>
                      {leadInitials && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-forest-500 text-[8px] font-semibold text-white">
                          {leadInitials}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {colMissions.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-[11px] text-gray-300">
                  Aucune mission
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
