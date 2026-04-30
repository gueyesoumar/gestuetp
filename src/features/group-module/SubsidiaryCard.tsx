import { Link } from 'react-router-dom'
import type { SubsidiaryRow } from './useSubsidiaries'

interface SubsidiaryCardProps {
  subsidiary: SubsidiaryRow
}

function bandFor(score: number | null): {
  label: string
  badge: string
  ring: string
  donut: string
  text: string
} {
  if (score === null) return { label: 'Sans donnée', badge: 'bg-gray-50 text-gray-500', ring: '', donut: '#9CA3AF', text: 'text-gray-400' }
  if (score >= 80) return { label: 'Conforme', badge: 'bg-green-50 text-green-700', ring: 'ring-1 ring-green-200', donut: '#16A34A', text: 'text-green-700' }
  if (score >= 60) return { label: 'Surveillance', badge: 'bg-amber-50 text-amber-700', ring: 'ring-1 ring-amber-200', donut: '#D4A843', text: 'text-amber-700' }
  return { label: 'Critique', badge: 'bg-red-50 text-red-700', ring: 'ring-1 ring-red-200', donut: '#DC2626', text: 'text-red-700' }
}

function formatShortDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export function SubsidiaryCard({ subsidiary }: SubsidiaryCardProps): JSX.Element {
  const { conformityScore, activeMissions, closedMissions, overdueCount, lastReviewDate, nextReviewDate, frameworkLabels } = subsidiary
  const band = bandFor(conformityScore)
  const dasharray = `${conformityScore ?? 0} 100`

  return (
    <Link
      to={`/filiales/${subsidiary.id}`}
      className={`block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition cursor-pointer ${band.ring}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-forest-50 flex items-center justify-center font-bold text-forest-700">{initials(subsidiary.name)}</div>
          <div>
            <p className="font-bold text-gray-900">{subsidiary.name}</p>
            <p className="text-[11px] text-gray-500">{subsidiary.sector ?? 'Secteur non renseigné'}{subsidiary.city ? ` · ${subsidiary.city}` : ''}</p>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${band.badge}`}>{band.label}</span>
      </div>

      <div className="flex items-center gap-4">
        <svg viewBox="0 0 36 36" className="w-16 h-16 shrink-0">
          <circle cx="18" cy="18" r="16" fill="none" strokeWidth="3" stroke="#E5E7EB"/>
          {conformityScore !== null && (
            <circle cx="18" cy="18" r="16" fill="none" strokeWidth="3" stroke={band.donut}
              strokeDasharray={dasharray} transform="rotate(-90 18 18)" strokeLinecap="round"/>
          )}
          <text x="18" y="20" textAnchor="middle" fontSize="9" fontWeight="700" fill={band.donut}>
            {conformityScore !== null ? `${conformityScore}%` : '—'}
          </text>
        </svg>
        <div className="flex-1 text-[12px] text-gray-700 space-y-1">
          <p>{activeMissions} mission{activeMissions !== 1 ? 's' : ''} active{activeMissions !== 1 ? 's' : ''} · {closedMissions} close{closedMissions !== 1 ? 's' : ''}</p>
          <p className="text-gray-500">{frameworkLabels.length > 0 ? frameworkLabels.join(' · ') : 'Aucun référentiel'}</p>
          <p className={`font-semibold ${overdueCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {overdueCount} plan{overdueCount !== 1 ? 's' : ''} en retard
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-[11px] text-gray-400">
        <span>Dernière revue : {formatShortDate(lastReviewDate)}</span>
        <span>Prochaine : {formatShortDate(nextReviewDate)}</span>
      </div>
    </Link>
  )
}
