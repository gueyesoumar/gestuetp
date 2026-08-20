// Devise de base plateforme : FCFA (XOF). Tous les montants sont STOCKÉS en XOF.
// L'affichage en € / $ est une conversion. XOF↔EUR est une parité FIXE (traité
// UEMOA) ; seul EUR↔USD flotte (récupéré via l'edge fx-rate). RFC 0006.

export type Currency = 'XOF' | 'EUR' | 'USD'
export const CURRENCIES: Currency[] = ['XOF', 'EUR', 'USD']
export const CURRENCY_LABEL: Record<Currency, string> = { XOF: 'FCFA', EUR: '€', USD: '$' }

/** Parité fixe : 1 EUR = 655,957 FCFA (non négociable). */
export const XOF_PER_EUR = 655.957

const FMT: Record<Currency, Intl.NumberFormat> = {
  XOF: new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }),
  EUR: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }),
  USD: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }),
}

/** Formate un montant stocké en FCFA (XOF) dans la devise d'affichage. */
export function formatMoney(xof: number, currency: Currency, eurUsd = 1.08): string {
  if (currency === 'XOF') return `${FMT.XOF.format(Math.round(xof))} FCFA`
  const eur = xof / XOF_PER_EUR
  return FMT[currency].format(currency === 'USD' ? eur * eurUsd : eur)
}
