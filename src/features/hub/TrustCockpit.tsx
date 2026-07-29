import { bandColor, bandLabel } from './trustBand'

// Cockpit « Mon organisation » : anneau de score (couleur plate) + contributeurs.
// Trust Score v1 = conformité seule ; les autres dimensions sont affichées
// « non configuré » (dégradation gracieuse) jusqu'à l'arrivée des modules.

interface Contributor {
  label: string
  detail: string
  value: number | null
  configured: boolean
}

const R = 52
const CIRC = 2 * Math.PI * R

export function TrustCockpit({ score }: { score: number | null }): JSX.Element {
  const color = bandColor(score)
  const pct = score ?? 0
  const contributors: Contributor[] = [
    { label: 'Conformité', detail: 'Comply', value: score, configured: true },
    { label: 'Exposition risque', detail: 'Risk', value: null, configured: false },
    { label: 'Maturité humaine', detail: 'Awareness', value: null, configured: false },
    { label: 'Incidents', detail: 'Regul', value: null, configured: false },
  ]

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6 sm:p-7">
      <div className="grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-7 items-center">
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 120 120" className="w-[150px] h-[150px]" role="img" aria-label="Trust Score">
            <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
            {score !== null && (
              <circle
                cx="60" cy="60" r={R} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct / 100)} transform="rotate(-90 60 60)"
              />
            )}
            <text x="60" y="58" textAnchor="middle" className="fill-white" style={{ fontSize: 30, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {score === null ? '—' : score}
            </text>
            <text x="60" y="76" textAnchor="middle" style={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}>/ 100</text>
          </svg>
          <span className="mt-2 text-[12.5px] font-bold" style={{ color }}>{bandLabel(score)}</span>
        </div>

        <div className="flex flex-col gap-3">
          {contributors.map((c) => (
            <div key={c.label} className="grid grid-cols-[150px_1fr_auto] gap-3 items-center">
              <div className="text-[12.5px]">
                <b className="block font-semibold text-white/90">{c.label}</b>
                <span className="text-[10.5px] text-white/45">{c.detail}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                {c.configured && c.value !== null && (
                  <div className="h-full rounded-full" style={{ width: `${c.value}%`, backgroundColor: bandColor(c.value) }} />
                )}
              </div>
              <div className="text-[12px] font-bold text-right tabular-nums" style={{ color: c.configured ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)' }}>
                {c.configured && c.value !== null ? c.value : 'n/c'}
              </div>
            </div>
          ))}
          <p className="text-[11.5px] text-white/40 mt-1">
            Score partiel &mdash; calcul&eacute; sur la conformit&eacute;. Les modules Risk, Awareness et incidents ne sont pas encore activ&eacute;s.
          </p>
        </div>
      </div>
    </div>
  )
}
