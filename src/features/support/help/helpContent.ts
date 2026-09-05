import type { HelpArticle } from '../../../types/database.types'

// Coordonnées de contact (config statique). Les ARTICLES vivent désormais en base
// (table help_articles), éditables depuis la console admin.

export const SUPPORT_CONTACT = {
  email: 'support@gestugroup.com',
  responseTime: 'Réponse sous 1 jour ouvré',
} as const

// Normalise pour une recherche insensible à la casse et aux accents.
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

export function searchHelpArticles(articles: HelpArticle[], query: string): HelpArticle[] {
  const q = normalize(query.trim())
  if (!q) return articles
  const terms = q.split(/\s+/)
  return articles.filter((a) => {
    const haystack = normalize([a.title, a.excerpt, a.body, a.category, ...a.keywords].join(' '))
    return terms.every((t) => haystack.includes(t))
  })
}
