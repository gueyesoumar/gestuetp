import { Activity, Clock, Users, FolderOpen } from 'lucide-react'
import type { ActivityStats } from './useCabinetHealth'
import { formatRelative } from './healthHelpers'

interface ActivityCardProps {
  data: ActivityStats
}

export function CabinetActivityCard({ data }: ActivityCardProps): JSX.Element {
  const connectedPct = data.membersTotal > 0 ? Math.round((data.membersConnected30d / data.membersTotal) * 100) : 0

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="px-5 py-3 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
          <Activity size={14} />
        </div>
        <h3 className="text-[13.5px] font-bold text-gray-900">Activité de l&apos;organisation</h3>
        <span className="ml-auto text-[10.5px] text-gray-400 font-medium">30 derniers jours</span>
      </header>
      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-[1fr_180px] gap-5 items-center">
        <div className="space-y-3">
          <Row
            icon={<Clock size={14} />}
            label="Dernière connexion d'un membre"
            sub={data.lastSignInUserEmail ?? '—'}
            value={formatRelative(data.lastSignInAt)}
            mono
          />
          <Row
            icon={<Users size={14} />}
            label="Membres connectés ces 30j"
            sub={`${data.membersConnected30d} sur ${data.membersTotal} (${connectedPct}%)`}
            slot={
              <div className="w-20 bg-gray-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${connectedPct}%` }} />
              </div>
            }
          />
          <Row
            icon={<FolderOpen size={14} />}
            label="Missions créées"
            sub={`${data.missionsCreated30d} nouvelle${data.missionsCreated30d > 1 ? 's' : ''} · ${data.missionsTotal} au total`}
            value={data.missionsCreated30d > 0 ? `+${data.missionsCreated30d}` : '0'}
            mono
          />
        </div>
        <Sparkline values={data.missionsCreatedDaily} />
      </div>
    </section>
  )
}

function Row({ icon, label, sub, value, slot, mono }: { icon: JSX.Element; label: string; sub: string; value?: string; slot?: JSX.Element; mono?: boolean }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-400 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] text-gray-700">{label}</p>
        <p className="text-[10.5px] text-gray-400 truncate">{sub}</p>
      </div>
      {slot ?? (value && <span className={`text-[12.5px] font-semibold text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</span>)}
    </div>
  )
}

function Sparkline({ values }: { values: number[] }): JSX.Element {
  const width = 170
  const height = 50
  const max = Math.max(1, ...values)
  const stepX = values.length > 1 ? width / (values.length - 1) : 0
  const points = values
    .map((v, i) => {
      const x = i * stepX
      const y = height - (v / max) * (height - 8) - 4
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const peakIdx = values.reduce((acc, v, i) => (v > values[acc] ? i : acc), 0)
  const peakValue = values[peakIdx] ?? 0
  const lastIdx = values.length - 1
  const lastX = lastIdx * stepX
  const lastY = height - ((values[lastIdx] ?? 0) / max) * (height - 8) - 4

  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Créations / jour</p>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto">
        <polyline points={points} fill="none" stroke="#1B4332" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={lastX} cy={lastY} r={3} fill="#D4A843" />
      </svg>
      <p className="text-[10px] text-gray-400 mt-0.5">
        {peakValue > 0 ? `Pic à ${peakValue} mission${peakValue > 1 ? 's' : ''}/jour` : 'Aucune création'}
      </p>
    </div>
  )
}
