import type { MappingCoverage } from './useQuestionMapping'

/** Bandeau d'indicateurs de couverture du mapping d'un référentiel. */
export function MappingKpis({ coverage }: { coverage: MappingCoverage }) {
  const covPct = coverage.totalControls > 0 ? Math.round((100 * coverage.controlsCovered) / coverage.totalControls) : 0
  const mapPct = coverage.totalQuestions > 0 ? Math.round((100 * coverage.questionsMapped) / coverage.totalQuestions) : 0

  const tiles: { v: string; sub?: string; l: string; tone: string; bar?: number }[] = [
    { v: String(coverage.controlsCovered), sub: `/${coverage.totalControls}`, l: 'Contrôles couverts', tone: 'text-forest-700', bar: covPct },
    { v: String(coverage.questionsMapped), sub: `/${coverage.totalQuestions}`, l: 'Questions mappées', tone: 'text-gray-900', bar: mapPct },
    { v: String(coverage.orphanQuestions), l: 'Questions orphelines', tone: coverage.orphanQuestions > 0 ? 'text-amber-700' : 'text-gray-900' },
    { v: String(coverage.uncoveredControls), l: 'Contrôles non couverts', tone: coverage.uncoveredControls > 0 ? 'text-red-600' : 'text-gray-900' },
    { v: String(coverage.criticalUncovered), l: 'Critiques sans preuve forte', tone: coverage.criticalUncovered > 0 ? 'text-red-600' : 'text-gray-900' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-gray-200 border-y border-gray-200">
      {tiles.map((t) => (
        <div key={t.l} className="bg-white px-3.5 py-3">
          <div className={`font-mono text-xl font-bold tracking-tight ${t.tone}`}>
            {t.v}{t.sub && <span className="text-[12px] text-gray-400">{t.sub}</span>}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">{t.l}</div>
          {t.bar != null && (
            <div className="h-1 rounded bg-gray-100 mt-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-forest-500 to-gold-500" style={{ width: `${t.bar}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
