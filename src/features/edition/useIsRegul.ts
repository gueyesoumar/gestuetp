import { useEdition } from './EditionContext'

// Vrai si l'org courante a la capacité de SUPERVISION — ce qui définit la persona
// « régulateur » (RFC 0002, P2). Remplace l'ancien test `edition === 'regul'` :
// équivalent aujourd'hui (une édition regul porte la capacité supervision, comply
// non), mais piloté par les CAPACITÉS, pas par l'édition. Résolu pour le staff ET
// le portail — les capacités d'un client sont résolues via son org superviseur
// (my_capabilities / migration 00161).
export function useIsRegul(): boolean {
  return useEdition().hasCapability('supervision')
}
