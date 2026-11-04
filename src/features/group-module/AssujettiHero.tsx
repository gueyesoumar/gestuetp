import { Play } from 'lucide-react'
import type { SubsidiaryDetail } from './useSubsidiaryDetail'
import type { AssujettiRegProfile } from './useAssujettiProfile'

interface AssujettiHeroProps {
  data: SubsidiaryDetail
  profile: AssujettiRegProfile | null
  onLaunch: () => void
}

const initials = (name: string): string =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')

/** En-tête du dossier d'assujetti : identité régulée (criticité/IIC, référentiels, statut). */
export function AssujettiHero({ data, profile, onLaunch }: AssujettiHeroProps): JSX.Element {
  const refs = Array.from(new Set(data.missions.map((m) => m.framework_name).filter(Boolean) as string[]))
  const location = [data.city, data.country].filter(Boolean).join(', ')
  const neverControlled = data.missions.length === 0
  const isIic = profile?.criticality === 'eleve'

  return (
    <div className="flex flex-wrap items-start gap-5 rounded-2xl bg-gradient-to-br from-forest-700 to-forest-900 p-6 text-white">
      <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15 text-[20px] font-extrabold">{initials(data.name)}</span>
      <div className="min-w-[240px] flex-1">
        {data.sector && <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60">Assujetti · {data.sector}</p>}
        <h2 className="mt-1 text-[22px] font-bold leading-tight tracking-[-0.02em]">{data.name}</h2>
        {location && <p className="mt-1 text-[13px] text-white/70">{location}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {isIic
            ? <span className="rounded-md bg-red-400/20 px-2.5 py-1 text-[11.5px] font-bold text-red-200">Criticité élevée · IIC</span>
            : <span className="rounded-md bg-white/12 px-2.5 py-1 text-[11.5px] font-bold text-white/85">Criticité standard</span>}
          {refs.map((r) => (
            <span key={r} className="rounded-md bg-gold-500/20 px-2.5 py-1 text-[11.5px] font-bold text-gold-200">Référentiel : {r}</span>
          ))}
          <span className="rounded-md bg-white/12 px-2.5 py-1 text-[11.5px] font-bold text-white/85">{neverControlled ? 'Jamais contrôlé' : 'Sous supervision'}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-3">
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/60">Conformité</p>
          <p className="mt-0.5 text-[15px] font-extrabold text-gold-400">{data.conformityScore !== null ? `${data.conformityScore}%` : 'Jamais évaluée'}</p>
        </div>
        <button
          type="button"
          onClick={onLaunch}
          className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-3.5 py-2 text-[13.5px] font-semibold text-forest-900 transition hover:brightness-105"
        >
          <Play size={15} /> Lancer un contrôle
        </button>
      </div>
    </div>
  )
}
