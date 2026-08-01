import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import { MissionKindBadge } from '../MissionKindBadge'
import type { MissionWithDetails } from '../useMissions'
import type { MissionStatus } from '../../../types/database.types'

interface MissionsSplitViewProps {
  missions: MissionWithDetails[]
}

const statusConfig: Record<MissionStatus, { label: string; variant: 'forest' | 'gold' | 'green' | 'gray' }> = {
  initialization: { label: 'Init.', variant: 'gray' },
  scoping: { label: 'Cadrage', variant: 'gray' },
  planning: { label: 'Planif.', variant: 'forest' },
  fieldwork: { label: 'Travaux', variant: 'forest' },
  internal_review: { label: 'Revue', variant: 'gold' },
  client_review: { label: 'Client', variant: 'gold' },
  closure: { label: 'Clôturée', variant: 'green' },
}

const fwIcons: Record<string, { abbr: string; bg: string }> = {
  'ISO/IEC 27001': { abbr: 'ISO', bg: 'bg-forest-100 text-forest-700' },
  'NIST Cybersecurity Framework': { abbr: 'NIST', bg: 'bg-blue-100 text-blue-700' },
  'COBIT': { abbr: 'COB', bg: 'bg-gold-200 text-gold-600' },
  'ITIL': { abbr: 'ITIL', bg: 'bg-indigo-100 text-indigo-700' },
  'Audit SI': { abbr: 'Gë', bg: 'bg-forest-900 text-gold-500' },
  'Due Diligence Technique': { abbr: 'Gë', bg: 'bg-forest-900 text-gold-500' },
  'Maturité Digitale': { abbr: 'Gë', bg: 'bg-forest-900 text-gold-500' },
}

export function MissionsSplitView({ missions }: MissionsSplitViewProps) {
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(missions[0]?.id ?? null)

  const selected = missions.find((m) => m.id === selectedId) ?? null

  return (
    <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden" style={{ height: 'calc(100vh - 240px)', minHeight: '480px' }}>
      {/* List */}
      <div className="w-[340px] border-r border-gray-200 overflow-y-auto flex-shrink-0">
        {missions.map((mission) => {
          const isActive = mission.id === selectedId
          const fw = fwIcons[mission.framework?.name ?? ''] ?? { abbr: '?', bg: 'bg-gray-100 text-gray-600' }
          const st = statusConfig[mission.status]

          return (
            <button
              key={mission.id}
              onClick={() => setSelectedId(mission.id)}
              className={`flex w-full items-start gap-3 px-4 py-3.5 text-left border-b border-gray-50 transition-colors ${
                isActive ? 'bg-forest-50 border-l-[3px] border-l-gold-500 pl-[13px]' : 'hover:bg-gray-50'
              }`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-[10px] text-[10px] font-extrabold flex-shrink-0 mt-0.5 ${fw.bg}`}>
                {fw.abbr}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-gray-900 truncate">{mission.name}</div>
                <div className="text-[11px] text-gray-300 truncate mt-0.5">{mission.client?.name}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge label={st.label} variant={st.variant} />
                  <MissionKindBadge kind={mission.kind} compact />
                  <span className="text-[10px] text-gray-400">{mission.progressPct}%</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[20px] font-bold text-gray-900">{selected.name}</h3>
                <p className="text-[13px] text-gray-500 mt-1">
                  {selected.client?.name} · {selected.framework?.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <MissionKindBadge kind={selected.kind} />
                <Badge label={statusConfig[selected.status].label} variant={statusConfig[selected.status].variant} />
                <button
                  onClick={() => navigate(`/missions/${selected.id}`)}
                  className="rounded-lg bg-forest-700 px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-forest-900 transition-colors"
                >
                  Ouvrir
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mt-5">
              <div className="text-center rounded-[10px] bg-forest-50 py-3">
                <div className="text-[18px] font-extrabold text-forest-700">{selected.evaluatedControls}</div>
                <div className="text-[10px] text-gray-400">Évalués</div>
              </div>
              <div className="text-center rounded-[10px] bg-forest-50 py-3">
                <div className="text-[18px] font-extrabold text-forest-700">{selected.totalControls}</div>
                <div className="text-[10px] text-gray-400">Total</div>
              </div>
              <div className="text-center rounded-[10px] bg-forest-50 py-3">
                <div className="text-[18px] font-extrabold text-forest-700">{selected.progressPct}%</div>
                <div className="text-[10px] text-gray-400">Progression</div>
              </div>
              <div className="text-center rounded-[10px] bg-forest-50 py-3">
                <div className={`text-[18px] font-extrabold ${
                  selected.scorePct !== null
                    ? selected.scorePct >= 80 ? 'text-success' : 'text-forest-700'
                    : 'text-gray-300'
                }`}>
                  {selected.scorePct !== null ? `${selected.scorePct}%` : '—'}
                </div>
                <div className="text-[10px] text-gray-400">Score</div>
              </div>
            </div>

            {/* Quick info */}
            <div className="mt-5 space-y-2">
              <InfoRow label="Chef de mission" value={selected.lead_auditor ? `${selected.lead_auditor.first_name} ${selected.lead_auditor.last_name}` : '—'} />
              <InfoRow label="Période" value={selected.start_date && selected.end_date ? `${formatDate(selected.start_date)} → ${formatDate(selected.end_date)}` : '—'} />
              <InfoRow label="Référentiel" value={`${selected.framework?.name ?? '—'} ${selected.framework?.version ? `v${selected.framework.version}` : ''}`} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[13px] text-gray-300">
            Sélectionnez une mission
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
      <span className="text-[12px] text-gray-500">{label}</span>
      <span className="text-[13px] font-medium text-gray-900">{value}</span>
    </div>
  )
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
