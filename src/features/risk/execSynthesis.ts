import type { PortfolioOrg, SupervisedRisk } from './useSupervisedPortfolio'

// Helpers de la synthèse exécutive (RFC 0018 Lot C). Tout se dérive des données
// superviseur déjà chargées (portfolio + registre consolidé) : aucune RPC dédiée.

export const exposureOf = (v: number, i: number): number => Math.round(((v * i) / 16) * 100)

/** Indice de protection national = 100 - exposition moyenne pondérée par le nombre de risques. */
export function protectionScore(orgs: PortfolioOrg[]): number {
  const tot = orgs.reduce((s, o) => s + o.scenario_count, 0)
  if (tot === 0) return 100
  const weighted = orgs.reduce((s, o) => s + o.avg_exposure * o.scenario_count, 0) / tot
  return Math.max(0, Math.min(100, Math.round(100 - weighted)))
}

export type Severity = 'critique' | 'serieux' | 'modere'
export const severityOf = (e: number): Severity => (e >= 60 ? 'critique' : e >= 30 ? 'serieux' : 'modere')
export const SEVERITY_LABEL: Record<Severity, string> = { critique: 'Critique', serieux: 'Sérieux', modere: 'Modéré' }
export const probaOf = (v: number): string => (v >= 4 ? 'Élevée' : v === 3 ? 'Moyenne à élevée' : v === 2 ? 'Moyenne' : 'Faible')
export const durationOf = (e: number): string => (e >= 70 ? 'Plusieurs jours à semaines' : e >= 40 ? 'Quelques heures à jours' : 'Impact limité')

export interface ExecThreat {
  id: string
  title: string
  org_name: string
  sector: string | null
  is_iic: boolean
  likelihood: number
  exposure: number
}

export function topThreats(rows: SupervisedRisk[], n = 5): ExecThreat[] {
  return rows
    .map((r) => ({
      id: r.id, title: r.title, org_name: r.org_name, sector: r.org_sector, is_iic: r.org_is_iic,
      likelihood: r.inherent_likelihood, exposure: exposureOf(r.inherent_likelihood, r.inherent_impact),
    }))
    .sort((a, b) => b.exposure - a.exposure)
    .slice(0, n)
}

/** Posture nationale en langage dirigeant selon l'indice de protection. */
export function postureLabel(protection: number): { label: string; tone: 'crit' | 'warn' | 'ok' } {
  if (protection < 45) return { label: 'Situation critique', tone: 'crit' }
  if (protection < 70) return { label: 'Vigilance renforcée', tone: 'warn' }
  return { label: 'Situation maîtrisée', tone: 'ok' }
}
