/**
 * Styles partagés des champs d'authentification (login + reset).
 * Centralisés ici pour garantir la même affordance et le même contraste AA
 * sur tous les formulaires du panneau sombre « Split souverain ».
 */

// Enveloppe de champ : surface délimitée + bordure or-teintée, focus visible.
export const FIELD_WRAP =
  'flex items-center rounded-xl border-[1.5px] border-[#D4A843]/[0.22] bg-[#1A3A2B] transition-colors hover:border-[#D4A843]/40 focus-within:border-[#D4A843] focus-within:shadow-[0_0_0_3px_rgba(212,168,67,0.28)]'

// Icône de tête du champ.
export const FIELD_LEAD = 'grid place-items-center pl-3.5 pr-0.5 text-[#8FA596]'

// Zone de saisie (hauteur de cible >= 44px via py-[13px] + texte 15px).
// border-0 + focus:shadow-none : neutralisent la bordure et le halo de focus que
// @layer base (index.css) applique à tout input ; ici le contour vit sur FIELD_WRAP.
export const FIELD_INPUT =
  'min-w-0 flex-1 border-0 bg-transparent py-[13px] pl-3 pr-3.5 text-[15px] text-[#F3F7F3] placeholder-[#8DA294] outline-none focus:shadow-none disabled:opacity-50'

// Libellé de champ (contraste AA sur fond sombre).
export const FIELD_LABEL = 'mb-2 flex items-center gap-2 text-[13px] font-medium text-[#E6EDE8]'

// Bouton d'action principal (CTA or saillant).
export const CTA_CLASS =
  'flex w-full items-center justify-center gap-2.5 rounded-xl py-[15px] text-[15px] font-extrabold text-[#1A2A20] shadow-[0_6px_16px_rgba(212,168,67,0.28)] transition-[filter] hover:brightness-[1.04] disabled:opacity-90'

export const CTA_GRADIENT = 'linear-gradient(180deg, #E0B856 0%, #D4A843 55%, #C6991F 100%)'
