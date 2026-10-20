import type { PortfolioOrg } from './useSupervisedPortfolio'

// Score d'attention composite et TRANSPARENT (D-B4) : priorise les assujettis qui
// demandent une action. Les infrastructures vitales (IIC) hors seuil remontent en tete.
// Calcule cote client depuis les champs deja renvoyes par get_supervised_org_portfolio.

export function attentionScore(o: PortfolioOrg, uncovered: boolean): number {
  let s = o.max_exposure + o.avg_exposure * 0.5
  if (o.is_iic) s += 25
  s += o.above_threshold * 6
  s += o.pending_directives * 8
  s += o.overdue_reviews * 5
  if (uncovered) s += 12
  return s
}

export type AttnTone = 'crit' | 'warn' | 'gold' | 'neutral'
export interface AttnReason { label: string; tone: AttnTone }

/** Raisons lisibles expliquant pourquoi une org demande de l'attention. */
export function attentionReasons(o: PortfolioOrg, uncovered: boolean): AttnReason[] {
  const r: AttnReason[] = []
  if (o.pending_directives > 0) r.push({ label: `${o.pending_directives} demande${o.pending_directives > 1 ? 's' : ''} en cours`, tone: 'crit' })
  if (o.above_threshold > 0) r.push({ label: `${o.above_threshold} hors seuil`, tone: 'warn' })
  if (o.overdue_reviews > 0) r.push({ label: `${o.overdue_reviews} revue${o.overdue_reviews > 1 ? 's' : ''} en retard`, tone: 'gold' })
  if (uncovered) r.push({ label: 'sans responsable', tone: 'neutral' })
  return r
}
