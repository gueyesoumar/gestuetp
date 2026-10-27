import type { Capability } from '../../types/database.types'

/**
 * Interrupteur unique de la « Vue d'ensemble » Risk (RiskPage), lu par le menu
 * (useSidebarNav) ET par la route (/risque dans App.tsx). Désactivée => pas d'entrée
 * de menu et la route redirige vers la Synthèse (inaccessible, même par URL).
 *
 * Choix actuel : désactivée pour le RÉGULATEUR (capacité `supervision`), qui pilote
 * par la Synthèse. Le cabinet à portail client la conserve.
 *
 * POUR LA RÉACTIVER partout : `return true`.
 */
export function riskOverviewEnabled(has: (cap: Capability) => boolean): boolean {
  return !has('supervision')
}
