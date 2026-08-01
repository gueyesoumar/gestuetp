import { FOREST_900, TEXT_500, TEXT_700 } from './colors'
import type { DocContext } from './context'
import { ROLE_LABELS } from '../../missions/mission-constants'
import { checkPage } from './page-chrome'
import { drawH3, drawSectionBanner, drawTable, setText, writeWrapped } from './primitives'
import { formatDate, truncate } from './utils'
import { frameworkLabel, generateGlossary } from '../auditReportNarratives'

// ── Annexes ───────────────────────────────────────────────────────────────

export function drawAnnexAGlossary(ctx: DocContext): void {
  drawSectionBanner(ctx, 'A', 'Glossaire', 'Définitions des termes techniques utilisés dans le rapport')
  // Largeur de colonne terme : 44 mm pour absorber « Revue documentaire »
  // (le plus long terme du glossaire) sans tronquer ni se coller à la def.
  const TERM_W = 44
  for (const g of generateGlossary()) {
    checkPage(ctx, 12)
    setText(ctx.doc, FOREST_900, 9.5, 'bold')
    ctx.doc.text(g.term, ctx.marginL, ctx.y)
    setText(ctx.doc, TEXT_700, 9.2, 'normal')
    const lines = ctx.doc.splitTextToSize(g.def, ctx.contentW - TERM_W) as string[]
    ctx.doc.text(lines[0] ?? '', ctx.marginL + TERM_W, ctx.y)
    ctx.y += 4.6
    for (let i = 1; i < lines.length; i++) {
      checkPage(ctx, 5)
      ctx.doc.text(lines[i], ctx.marginL + TERM_W, ctx.y); ctx.y += 4.6
    }
    ctx.y += 2
  }
}

export function drawAnnexBEvidence(ctx: DocContext): void {
  drawSectionBanner(ctx, 'B', 'Preuves examinées', "Liste des éléments documentaires versés au dossier de mission")
  if (ctx.data.evidenceDocs.length === 0) {
    writeWrapped(ctx, 'Aucun document n’a été versé au dossier de mission via la plateforme. Les preuves examinées au cours de l’audit ont fait l’objet de constats et d’extraits archivés dans les workpapers internes.', { color: TEXT_500 })
    return
  }
  writeWrapped(ctx, `Le tableau ci-dessous liste les ${ctx.data.evidenceDocs.length} document(s) versé(s) au dossier de la mission. Il s’agit des preuves examinées formellement par l’équipe d’audit en complément des entretiens, observations et tests substantifs conduits sur site.`, { size: 9.5, lineHeight: 4.8 })
  ctx.y += 3
  drawTable(ctx,
    ['Date', 'Type', 'Nom du fichier'],
    ctx.data.evidenceDocs.map((d) => [
      formatDate(d.created_at),
      d.document_type ?? '—',
      truncate(d.file_name, 80),
    ]),
    [28, 32, 114],
  )
}

export function drawAnnexCReferences(ctx: DocContext): void {
  drawSectionBanner(ctx, 'C', 'Références normatives', 'Standards, normes et bonnes pratiques mobilisés au cours de l’audit')
  const fw = frameworkLabel(ctx.data)
  const refs: { ref: string; title: string }[] = [
    { ref: fw || 'Référentiel d’audit', title: 'Cadre de référence principal de la mission' },
    { ref: 'ISO 19011:2018', title: 'Lignes directrices pour l’audit des systèmes de management' },
    { ref: 'ISO/IEC 17021-1:2015', title: 'Évaluation de la conformité — Exigences pour les organismes procédant à l’audit et à la certification des systèmes de management' },
    { ref: 'COSO Internal Control Framework (2013)', title: 'Cadre intégré de contrôle interne — Committee of Sponsoring Organizations of the Treadway Commission' },
    { ref: 'IIA — IPPF', title: 'International Professional Practices Framework — Institute of Internal Auditors' },
  ]
  for (const r of refs) {
    checkPage(ctx, 10)
    setText(ctx.doc, FOREST_900, 9.5, 'bold')
    ctx.doc.text(r.ref, ctx.marginL, ctx.y)
    setText(ctx.doc, TEXT_700, 9, 'normal')
    const lines = ctx.doc.splitTextToSize(r.title, ctx.contentW - 70) as string[]
    ctx.doc.text(lines[0] ?? '', ctx.marginL + 70, ctx.y)
    ctx.y += 5
    for (let i = 1; i < lines.length; i++) { ctx.doc.text(lines[i], ctx.marginL + 70, ctx.y); ctx.y += 5 }
    ctx.y += 2
  }
}

export function drawAnnexDDistribution(ctx: DocContext): void {
  drawSectionBanner(ctx, 'D', 'Liste de diffusion', 'Destinataires autorisés du présent rapport — confidentialité')

  writeWrapped(ctx, 'Le présent rapport est confidentiel et sa diffusion est strictement restreinte aux personnes listées ci-dessous. Toute communication, reproduction ou exploitation en dehors de ce périmètre nécessite l’accord préalable et écrit du cabinet.', { size: 9.5, lineHeight: 4.8 })
  ctx.y += 4

  drawH3(ctx, 'Côté cabinet')
  for (const m of ctx.data.members) {
    const u = (m as unknown as { user?: { first_name?: string; last_name?: string; email?: string; job_title?: string } }).user
    if (!u) continue
    const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
    const role = ROLE_LABELS[m.role] ?? m.role
    const job = u.job_title ?? ''
    drawDistributionRow(ctx, name, role + (job ? ` · ${job}` : ''), u.email ?? '')
  }

  ctx.y += 4
  drawH3(ctx, 'Côté entité auditée')
  if (ctx.data.clientContacts.length === 0) {
    writeWrapped(ctx, 'Aucun contact client n’a été déclaré sur la plateforme.', { color: TEXT_500 })
  } else {
    for (const c of ctx.data.clientContacts) {
      drawDistributionRow(ctx, c.contact_name, c.job_title ?? 'Contact', c.email)
    }
  }
}

function drawDistributionRow(ctx: DocContext, name: string, role: string, email: string): void {
  checkPage(ctx, 8)
  const { doc, marginL, contentW } = ctx
  setText(doc, FOREST_900, 9.5, 'bold')
  doc.text(name, marginL, ctx.y)
  setText(doc, TEXT_500, 8.5, 'normal')
  doc.text(role, marginL + 56, ctx.y)
  setText(doc, TEXT_700, 8.5, 'normal')
  doc.text(email, marginL + contentW, ctx.y, { align: 'right' })
  ctx.y += 5
}
