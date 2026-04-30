import type { SubsidiaryDetail } from './useSubsidiaryDetail'

interface SubsidiaryHeroProps {
  data: SubsidiaryDetail
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export function SubsidiaryHero({ data }: SubsidiaryHeroProps): JSX.Element {
  const trendDelta = data.scoreTrend.length >= 2
    ? data.scoreTrend[data.scoreTrend.length - 1].score - data.scoreTrend[data.scoreTrend.length - 2].score
    : null

  return (
    <div className="bg-gradient-to-br from-forest-700 to-forest-900 text-white p-6 rounded-xl">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white text-2xl shrink-0">
            {initials(data.name)}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] tracking-wider uppercase text-white/60">Filiale{data.sector ? ` · ${data.sector}` : ''}</p>
            <h2 className="text-2xl font-bold truncate">{data.name}</h2>
            <p className="text-[12px] text-white/70 mt-1">
              {[data.city, data.country].filter(Boolean).join(' · ') || 'Localisation non renseignée'}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] uppercase tracking-wider text-white/60">Conformité</p>
          {data.conformityScore !== null ? (
            <>
              <p className="text-5xl font-extrabold text-white">{data.conformityScore}<span className="text-2xl">%</span></p>
              {trendDelta !== null && trendDelta !== 0 && (
                <p className={`text-[12px] font-semibold mt-1 ${trendDelta > 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {trendDelta > 0 ? '+' : ''}{trendDelta} pts vs cycle précédent
                </p>
              )}
            </>
          ) : (
            <p className="text-2xl font-bold text-white/60">—</p>
          )}
        </div>
      </div>
    </div>
  )
}
