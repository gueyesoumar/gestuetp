import { TrendingUp } from 'lucide-react'

// Static data for visual purposes until historical data is available
const WEEKS = ['S-7', 'S-6', 'S-5', 'S-4', 'S-3', 'S-2', 'S-1', 'Auj.']
const SCORES = [42, 48, 55, 58, 63, 67, 72, 75]

const CHART_WIDTH = 400
const CHART_HEIGHT = 160
const PADDING_X = 40
const PADDING_Y = 20
const PLOT_WIDTH = CHART_WIDTH - PADDING_X * 2
const PLOT_HEIGHT = CHART_HEIGHT - PADDING_Y * 2

function scaleX(index: number): number {
  return PADDING_X + (index / (WEEKS.length - 1)) * PLOT_WIDTH
}

function scaleY(value: number): number {
  return PADDING_Y + PLOT_HEIGHT - (value / 100) * PLOT_HEIGHT
}

function buildLinePath(): string {
  return SCORES.map((score, i) => {
    const x = scaleX(i)
    const y = scaleY(score)
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')
}

function buildAreaPath(): string {
  const line = buildLinePath()
  const lastX = scaleX(SCORES.length - 1)
  const firstX = scaleX(0)
  const bottom = PADDING_Y + PLOT_HEIGHT
  return `${line} L ${lastX} ${bottom} L ${firstX} ${bottom} Z`
}

export function WeeklyPulse(): JSX.Element {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-forest-700" />
        <h3 className="text-[15px] font-bold text-gray-900">&Eacute;volution hebdomadaire</h3>
      </div>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label="Graphique d'&eacute;volution du score de conformit&eacute;"
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((val) => (
          <g key={val}>
            <line
              x1={PADDING_X}
              y1={scaleY(val)}
              x2={CHART_WIDTH - PADDING_X}
              y2={scaleY(val)}
              stroke="#E5E7EB"
              strokeWidth={0.5}
              strokeDasharray="4 2"
            />
            <text
              x={PADDING_X - 8}
              y={scaleY(val) + 3}
              textAnchor="end"
              className="text-[9px]"
              fill="#9CA3AF"
            >
              {val}%
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={buildAreaPath()} fill="url(#forestGradient)" opacity={0.15} />

        {/* Line */}
        <path d={buildLinePath()} fill="none" stroke="#2D6A4F" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {SCORES.map((score, i) => (
          <circle
            key={i}
            cx={scaleX(i)}
            cy={scaleY(score)}
            r={3}
            fill="#D4A843"
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
        ))}

        {/* X labels */}
        {WEEKS.map((label, i) => (
          <text
            key={label}
            x={scaleX(i)}
            y={CHART_HEIGHT - 2}
            textAnchor="middle"
            className="text-[9px]"
            fill="#9CA3AF"
          >
            {label}
          </text>
        ))}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="forestGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2D6A4F" />
            <stop offset="100%" stopColor="#2D6A4F" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      <div className="mt-2 text-[11px] text-gray-300 text-center">
        Donn&eacute;es illustratives &mdash; historique disponible prochainement
      </div>
    </div>
  )
}
