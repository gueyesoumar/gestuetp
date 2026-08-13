// Sanitization SVG partagée par les uploads de logo (cabinet-branding,
// organization-logos). Le SVG est le seul format image réellement risqué côté
// XSS ; on le nettoie côté serveur avant stockage.

export type SvgResult = { ok: true; svg: string } | { ok: false; reason: string }

/**
 * Sanitization SVG minimaliste mais suffisante pour le cas d'usage logo :
 *  - balises interdites : script, style, foreignObject, iframe, object, embed
 *  - attrs interdits : on* (onload, onclick, ...), href|xlink:href javascript:/data:text/html
 *  - DOCTYPE / ENTITY supprimés (anti-XXE)
 *  - le résultat doit toujours contenir un tag <svg
 *
 * Ne couvre pas les SVG ultra-exotiques — pour ceux-là, refuser et demander un PNG.
 */
export function sanitizeSvg(source: string): SvgResult {
  if (source.length > 200_000) {
    return { ok: false, reason: 'Fichier trop volumineux pour parsing' }
  }

  let svg = source

  // Drop BOM
  if (svg.charCodeAt(0) === 0xFEFF) svg = svg.slice(1)
  svg = svg.trim()

  // Doit contenir <svg
  if (!/<svg[\s>]/i.test(svg)) {
    return { ok: false, reason: 'tag <svg> manquant' }
  }

  // Supprime DOCTYPE pour éviter XXE
  svg = svg.replace(/<!DOCTYPE[\s\S]*?>/gi, '')
  // Supprime entités externes
  svg = svg.replace(/<!ENTITY[\s\S]*?>/gi, '')

  // Supprime balises dangereuses (avec leur contenu pour script/style/foreignObject)
  svg = svg.replace(/<script[\s\S]*?<\/script\s*>/gi, '')
  svg = svg.replace(/<style[\s\S]*?<\/style\s*>/gi, '')
  svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
  svg = svg.replace(/<iframe[\s\S]*?<\/iframe\s*>/gi, '')
  svg = svg.replace(/<object[\s\S]*?<\/object\s*>/gi, '')
  svg = svg.replace(/<embed\b[^>]*\/?>/gi, '')
  // Auto-fermantes
  svg = svg.replace(/<script\b[^>]*\/>/gi, '')
  svg = svg.replace(/<foreignObject\b[^>]*\/>/gi, '')

  // Supprime tous les attributs on* (onload, onclick, onmouseover, ...)
  svg = svg.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '')

  // Supprime href / xlink:href contenant javascript: ou data:text/html
  svg = svg.replace(/\s+(?:xlink:)?href\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi, '')
  svg = svg.replace(/\s+(?:xlink:)?href\s*=\s*("\s*data:text\/html[^"]*"|'\s*data:text\/html[^']*')/gi, '')

  // Supprime style="..." contenant url(javascript:...) ou expression()
  svg = svg.replace(/\s+style\s*=\s*("[^"]*"|'[^']*')/gi, (match) => {
    if (/javascript:|expression\(/i.test(match)) return ''
    return match
  })

  if (!/<svg[\s>]/i.test(svg)) {
    return { ok: false, reason: 'svg vidé après sanitization' }
  }

  return { ok: true, svg }
}
