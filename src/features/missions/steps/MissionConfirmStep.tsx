import { Target } from 'lucide-react'
import type { Framework, CabinetClient } from '../../../types/database.types'
import type { MemberWithRoles } from '../../members/types'

interface MissionConfirmStepProps {
  missionName: string
  framework: Framework | null
  client: CabinetClient | null
  associateId: string
  leadAuditorId: string
  teamSize: number
  startDate: string
  endDate: string
  members: MemberWithRoles[]
}

export function MissionConfirmStep({
  missionName, framework, client,
  associateId, leadAuditorId, teamSize, startDate, endDate, members,
}: MissionConfirmStepProps) {
  const associate = members.find((m) => m.id === associateId)
  const lead = members.find((m) => m.id === leadAuditorId)

  const rows: { label: string; value: string }[] = [
    { label: 'Mission', value: missionName || '\u2014' },
    { label: 'Client', value: client ? `${client.client_name}${client.client_sector ? ` \u00b7 ${client.client_sector}` : ''}` : '\u2014' },
    { label: 'R\u00e9f\u00e9rentiel', value: framework ? `${framework.name} ${framework.version ? `v${framework.version}` : ''}` : '\u2014' },
    { label: 'P\u00e9riode', value: startDate && endDate ? `${formatDate(startDate)} \u2192 ${formatDate(endDate)}` : '\u2014' },
    { label: 'Associ\u00e9', value: associate ? `${associate.first_name} ${associate.last_name}` : '\u2014' },
    { label: 'Chef de mission', value: lead ? `${lead.first_name} ${lead.last_name}` : '\u2014' },
    { label: '\u00c9quipe', value: `${teamSize} membre${teamSize > 1 ? 's' : ''}` },
  ]

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900">R&eacute;capitulatif</h3>
      <p className="mt-1 text-[13px] text-gray-500">V&eacute;rifiez les informations avant de cr&eacute;er la mission</p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatBox label="R&eacute;f&eacute;rentiel" value={framework?.name ?? '\u2014'} />
        <StatBox label="Auditeurs" value={String(teamSize)} />
        <StatBox label="P&eacute;riode" value={startDate && endDate ? `${daysBetween(startDate, endDate)}j` : '\u2014'} />
      </div>

      <div className="mt-3 rounded-lg border border-forest-200 bg-forest-50 px-4 py-2.5">
        <p className="text-xs text-forest-700">
          <Target size={13} className="inline mr-1" />Le p&eacute;rim&egrave;tre d&eacute;taill&eacute; (domaines et contr&ocirc;les) sera d&eacute;fini lors de la phase de cadrage.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 overflow-hidden">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[140px_1fr] border-b border-gray-50 last:border-b-0">
            <div className="px-4 py-3 bg-page-bg border-r border-gray-200 text-[12px] font-medium text-gray-500">{row.label}</div>
            <div className="px-4 py-3 text-[13px] font-semibold text-gray-900">{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center rounded-[10px] bg-forest-50 py-3.5">
      <div className="text-[22px] font-extrabold text-forest-700">{value}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysBetween(start: string, end: string): number {
  return Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000))
}
