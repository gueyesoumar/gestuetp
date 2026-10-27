import type { PortfolioOrg } from './useSupervisedPortfolio'

// Radar en 4 quadrants (zones de risque) pour la Synthèse exécutive. Chaque quadrant
// agrège les entités d'une zone ; « non évalué » = aucun scénario de risque coté.
export type RiskZoneKey = 'crit' | 'surv' | 'maitr' | 'nonev'
export type RadarView = 'sector' | 'org' | 'vital'

export interface RadarItem {
  label: string
  exposure: number | null
  vital: boolean
  breach: boolean
  /** Complément affiché en vue Secteur (ex. « 3 assujettis »). */
  sub: string | null
}
export interface RiskQuadrant { key: RiskZoneKey; name: string; items: RadarItem[] }

export const ZONE_META: { key: RiskZoneKey; name: string; color: string; angle: [number, number] }[] = [
  { key: 'crit', name: 'Critique', color: '#C0392B', angle: [0, 90] },
  { key: 'surv', name: 'Surveillance', color: '#D68910', angle: [90, 180] },
  { key: 'maitr', name: 'Maîtrisé', color: '#27AE60', angle: [180, 270] },
  { key: 'nonev', name: 'Non évalué', color: '#9CA3AF', angle: [270, 360] },
]

const isScored = (o: PortfolioOrg): boolean => o.scenario_count > 0
const zoneOf = (e: number | null): RiskZoneKey => (e === null ? 'nonev' : e >= 60 ? 'crit' : e >= 30 ? 'surv' : 'maitr')

/** Répartit les entités (ou secteurs) dans les 4 quadrants selon la vue choisie. */
export function buildQuadrants(orgs: PortfolioOrg[], view: RadarView): RiskQuadrant[] {
  const byKey: Record<RiskZoneKey, RadarItem[]> = { crit: [], surv: [], maitr: [], nonev: [] }

  if (view === 'sector') {
    const bySec = new Map<string, PortfolioOrg[]>()
    orgs.forEach((o) => {
      const k = o.sector ?? 'Autre'
      bySec.set(k, [...(bySec.get(k) ?? []), o])
    })
    bySec.forEach((list, sec) => {
      const scored = list.filter(isScored)
      const exp = scored.length ? Math.round(scored.reduce((s, o) => s + o.avg_exposure, 0) / scored.length) : null
      byKey[zoneOf(exp)].push({
        label: sec, exposure: exp,
        vital: list.some((o) => o.is_iic), breach: list.some((o) => o.above_threshold > 0),
        sub: `${list.length} assujetti${list.length > 1 ? 's' : ''}`,
      })
    })
  } else {
    const src = view === 'vital' ? orgs.filter((o) => o.is_iic) : orgs
    src.forEach((o) => {
      const exp = isScored(o) ? Math.round(o.avg_exposure) : null
      byKey[zoneOf(exp)].push({ label: o.org_name, exposure: exp, vital: o.is_iic, breach: o.above_threshold > 0, sub: null })
    })
  }

  return ZONE_META.map((z) => ({ key: z.key, name: z.name, items: byKey[z.key] }))
}
