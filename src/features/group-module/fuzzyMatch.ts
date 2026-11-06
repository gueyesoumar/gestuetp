/** Détection de doublons par similarité approximative de noms (import en masse).
 *  Sans dépendance : normalisation + Levenshtein + Dice sur mots + containment. */

export function normalizeName(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

const STOP = new Set(['de', 'la', 'le', 'du', 'des', 'les', 'et', 'l', 'd', 'a', 'au', 'aux', 'en', 'the', 'of'])

function tokens(s: string): string[] {
  return normalizeName(s).split(' ').filter((w) => w.length > 0 && !STOP.has(w))
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  let cur = new Array<number>(b.length + 1)
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    [prev, cur] = [cur, prev]
  }
  return prev[b.length]
}

function levRatio(a: string, b: string): number {
  const max = Math.max(a.length, b.length)
  return max === 0 ? 1 : 1 - levenshtein(a, b) / max
}

function dice(a: string[], b: string[]): number {
  const sa = new Set(a), sb = new Set(b)
  if (sa.size === 0 || sb.size === 0) return 0
  let inter = 0
  for (const t of sa) if (sb.has(t)) inter++
  return (2 * inter) / (sa.size + sb.size)
}

/** Score de similarité 0..1 entre deux noms (1 = identique après normalisation). */
export function similarity(a: string, b: string): number {
  const na = normalizeName(a), nb = normalizeName(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  const ta = tokens(a), tb = tokens(b)
  const [shortSet, longSet] = ta.length <= tb.length ? [new Set(ta), new Set(tb)] : [new Set(tb), new Set(ta)]
  let contained = shortSet.size >= 2
  if (contained) for (const t of shortSet) if (!longSet.has(t)) { contained = false; break }
  return Math.max(levRatio(na, nb), dice(ta, tb), contained ? 0.9 : 0)
}

export interface SimilarHit { name: string; score: number }

/** Meilleur candidat similaire au-dessus du seuil, sinon null. */
export function findSimilar(name: string, candidates: string[], threshold = 0.85): SimilarHit | null {
  let best: SimilarHit | null = null
  for (const c of candidates) {
    const score = similarity(name, c)
    if (score >= threshold && (!best || score > best.score)) best = { name: c, score }
  }
  return best
}
