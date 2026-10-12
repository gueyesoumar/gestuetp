import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import type { CheckWithEvidence } from './useContinuousCompliance'

/** Synthèse des alertes de conformité continue (RFC 0014 P2) : non-conformités,
 *  points à surveiller et preuves périmées, dérivés de la dernière preuve par check. */
export function ContinuousAlertSummary({ checks }: { checks: CheckWithEvidence[] }): JSX.Element | null {
  const evaluated = checks.filter((c) => c.latest)
  if (evaluated.length === 0) return null

  const now = Date.now()
  const fails = evaluated.filter((c) => c.latest!.verdict === 'fail').length
  const warns = evaluated.filter((c) => c.latest!.verdict === 'warn').length
  const stale = evaluated.filter((c) => c.latest!.expires_at && new Date(c.latest!.expires_at).getTime() < now).length

  const tone = fails > 0
    ? { bg: 'bg-red-50 border-red-200 text-red-700', Icon: AlertTriangle }
    : warns > 0 || stale > 0
    ? { bg: 'bg-gold-50 border-gold-200 text-gold-700', Icon: Clock }
    : { bg: 'bg-green-50 border-green-200 text-green-700', Icon: CheckCircle2 }

  const parts: string[] = []
  if (fails > 0) parts.push(`${fails} non-conformité${fails > 1 ? 's' : ''}`)
  if (warns > 0) parts.push(`${warns} à surveiller`)
  if (stale > 0) parts.push(`${stale} preuve${stale > 1 ? 's' : ''} périmée${stale > 1 ? 's' : ''}`)
  const message = parts.length > 0 ? parts.join(' · ') : 'Tous les contrôles automatisés sont conformes.'

  return (
    <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${tone.bg}`}>
      <tone.Icon size={16} className="shrink-0" />
      <p className="text-[12px] font-medium">{message}</p>
    </div>
  )
}
