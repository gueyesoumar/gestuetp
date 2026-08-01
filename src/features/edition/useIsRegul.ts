import { useEdition } from './EditionContext'
import { preAuthEdition } from '../../lib/product'

// Vrai si l'édition courante est « regul », résolu AU RUNTIME avec repli sur le
// drapeau de build tant que l'édition n'est pas connue (même pattern qu'AppRoot).
//
// Réservé au STAFF (dont l'édition se résout). Le PORTAIL (role=client) reste sur
// le build via `isRegul` direct : son org est neutralisée côté RLS, donc l'édition
// ne se résout pas — la résolution capacités côté portail viendra à l'incrément 4b.
export function useIsRegul(): boolean {
  const { edition } = useEdition()
  return (edition ?? preAuthEdition()) === 'regul'
}
