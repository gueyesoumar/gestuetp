import { useNavigate } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import { MissionKindBadge } from '../MissionKindBadge'
import type { MissionWithDetails } from '../useMissions'
import type { MissionStatus } from '../../../types/database.types'

interface MissionsCardsViewProps {
  missions: MissionWithDetails[]
}

const statusConfig: Record<MissionStatus, { label: string; variant: 'forest' | 'gold' | 'green' | 'gray'; barColor: string }> = {
  initialization: { label: 'Init.', variant: 'gray', barColor: 'bg-gray-300' },
  scoping: { label: 'Cadrage', variant: 'gray', barColor: 'bg-gray-300' },
  planning: { label: 'Planif.', variant: 'forest', barColor: 'bg-forest-300' },
  fieldwork: { label: 'Travaux', variant: 'forest', barColor: 'bg-forest-500' },
  internal_review: { label: 'Revue', variant: 'gold', barColor: 'bg-gold-500' },
  client_review: { label: 'Client', variant: 'gold', barColor: 'bg-forest-300' },
  closure: { label: 'Clôturée', variant: 'green', barColor: 'bg-success' },
}

const phaseOrder: MissionStatus[] = ['initialization', 'scoping', 'planning', 'fieldwork', 'internal_review', 'client_review', 'closure']

const fwIcons: Record<string, { abbr: string; bg: string }> = {
  'ISO/IEC 27001': { abbr: 'ISO', bg: 'bg-forest-100 text-forest-700' },
  'NIST Cybersecurity Framework': { abbr: 'NIST', bg: 'bg-blue-100 text-blue-700' },
  'COBIT': { abbr: 'COB', bg: 'bg-gold-200 text-gold-600' },
  'ITIL': { abbr: 'ITIL', bg: 'bg-indigo-100 text-indigo-700' },
  'Audit SI': { abbr: 'Gë', bg: 'bg-forest-900 text-gold-500' },
  'Due Diligence Technique': { abbr: 'Gë', bg: 'bg-forest-900 text-gold-500' },
  'Maturité Digitale': { abbr: 'Gë', bg: 'bg-forest-900 text-gold-500' },
}

export function MissionsCardsView({ missions }: MissionsCardsViewProps) {
  const navigate = useNavigate()

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {missions.map((mission) => {
        const st = statusConfig[mission.status]
        const fw = fwIcons[mission.framework?.name ?? ''] ?? { abbr: '?', bg: 'bg-gray-100 text-gray-600' }
        const isClosed = mission.status === 'closure'
        const currentPhaseIdx = phaseOrder.indexOf(mission.status)
        const leadInitials = mission.lead_auditor
          ? `${mission.lead_auditor.first_name.charAt(0)}${mission.lead_auditor.last_name.charAt(0)}`
          : null
        const endDate = mission.end_date
          ? new Date(mission.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
          : null

        return (
          <div
            key={mission.id}
            onClick={() => navigate(`/missions/${mission.id}`)}
            className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 cursor-pointer transition-all hover:shadow-md hover:border-forest-300 ${isClosed ? 'opacity-70' : ''}`}
          >
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${st.barColor}`} />

            <div className="flex items-start justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-[10px] text-[11px] font-extrabold ${fw.bg}`}>
                {fw.abbr}
              </div>
              <div className="flex items-center gap-1.5">
                <MissionKindBadge kind={mission.kind} />
                <Badge label={st.label} variant={st.variant} />
              </div>
            </div>

            <div className="mt-3 text-[15px] font-bold text-gray-900">{mission.name}</div>
            <div className="mt-0.5 text-[12px] text-gray-300">{mission.client?.name}</div>

            <div className="mt-3.5">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-gray-400">{mission.scorePct !== null ? 'Score' : 'Progression'}</span>
                <span className={`font-bold ${
                  mission.scorePct !== null
                    ? mission.scorePct >= 80 ? 'text-success' : mission.scorePct >= 60 ? 'text-forest-700' : 'text-gold-600'
                    : 'text-gray-600'
                }`}>
                  {mission.scorePct !== null ? `${mission.scorePct}%` : `${mission.progressPct}%`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${isClosed ? 'bg-success' : st.barColor}`}
                  style={{ width: `${mission.scorePct ?? mission.progressPct}%` }}
                />
              </div>
            </div>

            {/* Mini phases */}
            <div className="flex gap-[3px] mt-3">
              {phaseOrder.map((phase, idx) => (
                <div
                  key={phase}
                  className={`flex-1 h-1 rounded-full ${
                    isClosed
                      ? 'bg-success'
                      : idx <= currentPhaseIdx
                        ? st.barColor
                        : 'bg-gray-100'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-gray-50">
              <div className="flex items-center gap-2">
                {leadInitials && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-forest-500 text-[9px] font-semibold text-white">
                    {leadInitials}
                  </div>
                )}
                {endDate && <span className="text-[11px] text-gray-300">{endDate}</span>}
              </div>
              <span className="text-[11px] text-gray-300">
                {mission.evaluatedControls}/{mission.totalControls} contrôles
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
