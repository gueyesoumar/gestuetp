// Paliers du Trust Score (mêmes seuils que healthDotClass du dashboard).
// Couleurs plates issues de la charte (BRAND.md) — pas de dégradé.

export function bandColor(score: number | null): string {
  if (score === null) return 'rgba(255,255,255,0.45)'
  if (score >= 80) return '#27AE60' // success
  if (score >= 60) return '#D4A843' // gold-500
  return '#C0392B' // error
}

export function bandLabel(score: number | null): string {
  if (score === null) return 'Non évalué'
  if (score >= 80) return 'Solide'
  if (score >= 60) return 'À surveiller'
  return 'À risque'
}
