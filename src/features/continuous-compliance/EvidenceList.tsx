import { Badge } from '../../components/ui/Badge'
import type { EvidenceVerdict } from '../../types/database.types'
import type { CheckWithEvidence } from './useContinuousCompliance'

const VERDICT: Record<EvidenceVerdict, { label: string; variant: 'green' | 'red' | 'gold' | 'gray' }> = {
  pass: { label: 'Conforme', variant: 'green' },
  fail: { label: 'Non conforme', variant: 'red' },
  warn: { label: 'À surveiller', variant: 'gold' },
  na: { label: 'Non évalué', variant: 'gray' },
}

function freshness(collectedAt: string, expiresAt: string | null): string {
  const days = Math.floor((Date.now() - new Date(collectedAt).getTime()) / 86400000)
  const age = days <= 0 ? "aujourd'hui" : days === 1 ? 'hier' : `il y a ${days} j`
  const stale = expiresAt && new Date(expiresAt).getTime() < Date.now()
  return stale ? `${age} · preuve périmée` : age
}

function summarize(value: Record<string, unknown>): string {
  return Object.entries(value)
    .filter(([k]) => k !== 'note' && k !== 'params')
    .map(([k, v]) => `${k} : ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ')
}

/** Liste des checks du connecteur avec leur dernière preuve collectée (RFC 0014 P1.4). */
export function EvidenceList({ checks }: { checks: CheckWithEvidence[] }): JSX.Element {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Contrôles automatisés</span>
      </div>
      {checks.length === 0 ? (
        <p className="px-4 py-6 text-center text-[12px] text-gray-400">Aucun contrôle automatisé pour ce connecteur.</p>
      ) : (
        checks.map(({ check, latest }) => {
          const v = latest ? VERDICT[latest.verdict] : null
          return (
            <div key={check.id} className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0">
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-gray-900">{check.title}</p>
                {latest ? (
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                    {summarize(latest.value)}{summarize(latest.value) ? ' · ' : ''}{freshness(latest.collected_at, latest.expires_at)}
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-400 mt-0.5">Jamais collecté</p>
                )}
              </div>
              {v ? <Badge label={v.label} variant={v.variant} /> : <Badge label="En attente" variant="gray" />}
            </div>
          )
        })
      )}
    </div>
  )
}
