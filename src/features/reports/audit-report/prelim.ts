import { BORDER, FOREST_900, GOLD_500, RED, TEXT_400, TEXT_500, TEXT_700, TEXT_900, WHITE } from './colors'
import type { DocContext } from './context'
import { clientLabel, frameworkLabel, generateExecutiveLetterBody } from '../auditReportNarratives'
import type { LogoData } from './logo-loader'
import { setPageContext } from './page-chrome'
import { fillRect, fillRounded, setText, strokeRounded, writeWrapped } from './primitives'
import { formatDate, formatPeriodShort, memberName } from './utils'

// ── Couverture ─────────────────────────────────────────────────────────────

export function drawCoverPage(ctx: DocContext, clientLogo: LogoData | null, cabinetLogoLight: LogoData | null, cabinetLogoDark: LogoData | null): void {
  const { doc, data, pageW, pageH, marginL } = ctx
  // Hero plein (Deloitte-style : grande zone foncée)
  fillRect(doc, 0, 0, pageW, 175, ctx.palette.primary)
  // accent or épais
  fillRect(doc, 0, 175, pageW, 4, ctx.palette.accent)

  // Logo cabinet (version dark si dispo, sinon light dans cartouche blanc)
  const cabLogo = cabinetLogoDark ?? cabinetLogoLight
  if (cabLogo) {
    const lw = 36, lh = 18
    if (!cabinetLogoDark) fillRounded(doc, marginL - 1, 21, lw + 2, lh + 2, 1.5, WHITE)
    doc.addImage(cabLogo.dataUrl, cabLogo.format, marginL, 22, lw, lh, undefined, 'FAST')
  } else {
    setText(doc, WHITE, 12, 'bold')
    doc.text(data.cabinetName.toUpperCase(), marginL, 30)
  }

  // Référence rapport — coin haut droit
  setText(doc, GOLD_500, 8.5, 'bold')
  doc.text(ctx.reportRef, pageW - marginL, 30, { align: 'right' })
  setText(doc, [200, 220, 210], 7.5, 'normal')
  doc.text('CONFIDENTIEL · Diffusion restreinte', pageW - marginL, 35, { align: 'right' })

  // Eyebrow
  setText(doc, GOLD_500, 9, 'bold')
  doc.text('RAPPORT D’AUDIT', marginL, 88)

  // Titre principal
  setText(doc, WHITE, 30, 'bold')
  const fwLabel = frameworkLabel(data)
  const isFwGeneric = fwLabel === 'le référentiel applicable'
  const titleLine1 = 'Rapport d’audit'
  const titleLine2 = isFwGeneric ? 'de conformité' : fwLabel
  doc.text(titleLine1, marginL, 102)
  setText(doc, WHITE, 22, 'bold')
  const subLines = doc.splitTextToSize(titleLine2, pageW - 2 * marginL) as string[]
  let ty = 116
  for (const l of subLines) { doc.text(l, marginL, ty); ty += 9 }

  // Client name
  setText(doc, [220, 230, 225], 14, 'normal')
  doc.text(clientLabel(data), marginL, ty + 4)

  // Bandeau infos clés — colonnes calibrées (largeur dispo 174 mm)
  // Colonnes : période 78mm | version 38mm | date 58mm
  const COL1_X = marginL
  const COL2_X = marginL + 78
  const COL3_X = marginL + 78 + 38
  setText(doc, [200, 220, 210], 8, 'bold')
  doc.text('PÉRIODE D’AUDIT', COL1_X, 152)
  doc.text('VERSION', COL2_X, 152)
  doc.text('DATE D’ÉMISSION', COL3_X, 152)
  setText(doc, WHITE, 9.5, 'normal')
  doc.text(formatPeriodShort(data.mission.start_date, data.mission.end_date), COL1_X, 159)
  doc.text('Définitive — V1.0', COL2_X, 159)
  doc.text(formatDate(new Date().toISOString()), COL3_X, 159)

  // Zone basse blanche : équipe + logo client
  // Équipe d'audit
  setText(doc, TEXT_500, 8, 'bold')
  doc.text('ÉQUIPE D’AUDIT', marginL, 195)
  setText(doc, FOREST_900, 11, 'bold')
  const lead = ctx.data.members.find((m) => m.role === 'lead_auditor')
  const associate = ctx.data.members.find((m) => m.role === 'associate')
  const auditors = ctx.data.members.filter((m) => m.role !== 'lead_auditor' && m.role !== 'associate')
  let ey = 202
  if (associate) { doc.text(`${memberName(associate)}`, marginL, ey); setText(doc, TEXT_500, 8.5, 'normal'); doc.text('Associé signataire', marginL, ey + 4); setText(doc, FOREST_900, 11, 'bold'); ey += 10 }
  if (lead)      { doc.text(`${memberName(lead)}`, marginL, ey);      setText(doc, TEXT_500, 8.5, 'normal'); doc.text('Chef de mission', marginL, ey + 4);     setText(doc, FOREST_900, 11, 'bold'); ey += 10 }
  setText(doc, TEXT_700, 9, 'normal')
  if (auditors.length > 0) {
    doc.text(`${auditors.length} auditeur${auditors.length > 1 ? 's' : ''} de mission`, marginL, ey)
  }

  // Logo client en bas droite
  if (clientLogo) {
    const maxW = 44, maxH = 26
    const ratio = clientLogo.width / clientLogo.height
    let lw = maxW, lh = maxW / ratio
    if (lh > maxH) { lh = maxH; lw = maxH * ratio }
    const lx = pageW - marginL - lw - 4
    const ly = 195
    fillRounded(doc, lx - 1, ly - 1, lw + 4, lh + 4, 1.5, WHITE)
    strokeRounded(doc, lx - 1, ly - 1, lw + 4, lh + 4, 1.5, BORDER, 0.3)
    doc.addImage(clientLogo.dataUrl, clientLogo.format, lx + 1, ly + 1, lw, lh, undefined, 'FAST')
  }

  // Pied couverture
  doc.setDrawColor(...GOLD_500); doc.setLineWidth(0.6)
  doc.line(marginL, pageH - 38, pageW - marginL, pageH - 38)
  setText(doc, TEXT_500, 7, 'bold')
  doc.text('CABINET D’AUDIT', marginL, pageH - 33)
  doc.text('CONTACT', marginL + 70, pageH - 33)
  doc.text('CLASSIFICATION', pageW - marginL, pageH - 33, { align: 'right' })
  setText(doc, FOREST_900, 9, 'bold')
  doc.text(data.cabinetName, marginL, pageH - 28)
  setText(doc, TEXT_700, 8.5, 'normal')
  if (data.cabinetAddress) {
    const addrLines = data.cabinetAddress.split('\n')
    let ay = pageH - 23
    for (const l of addrLines) { doc.text(l, marginL, ay); ay += 4 }
  }
  if (data.cabinetWebsite) doc.text(data.cabinetWebsite, marginL + 70, pageH - 28)
  if (data.cabinetPhone)   doc.text(data.cabinetPhone, marginL + 70, pageH - 23)
  if (data.cabinetSupportEmail) doc.text(data.cabinetSupportEmail, marginL + 70, pageH - 18)
  setText(doc, RED, 9, 'bold')
  doc.text('CONFIDENTIEL', pageW - marginL, pageH - 28, { align: 'right' })
  setText(doc, TEXT_500, 7.5, 'normal')
  doc.text('Diffusion restreinte (cf. Annexe D)', pageW - marginL, pageH - 23, { align: 'right' })
}

// ── Lettre executive (1 page, signée Associé) ─────────────────────────────

export function drawExecutiveLetter(ctx: DocContext, cabinetLogoLight: LogoData | null): void {
  ctx.doc.addPage()
  ctx.y = 22
  ctx.currentSection = 'Lettre de mission'
  ctx.sectionByPage.set(ctx.doc.getCurrentPageInfo().pageNumber, ctx.currentSection)
  ctx.tocAnchors.push({ num: '', title: 'Lettre au comité d’audit', page: ctx.doc.getCurrentPageInfo().pageNumber })

  const { doc, marginL, pageW } = ctx

  // Header cabinet : logo gauche, méta-infos droite. La méta-info droite
  // n'affiche pas le nom cabinet quand il y a un logo (sinon doublon visuel).
  if (cabinetLogoLight) {
    doc.addImage(cabinetLogoLight.dataUrl, cabinetLogoLight.format, marginL, ctx.y, 32, 16, undefined, 'FAST')
  } else {
    setText(doc, FOREST_900, 13, 'bold')
    doc.text(ctx.data.cabinetName, marginL, ctx.y + 8)
  }
  setText(doc, TEXT_500, 7.5, 'normal')
  let cy = ctx.y + 4
  if (!cabinetLogoLight) {
    // Pas de logo : on peut mettre nom + adresse en miroir à droite
    doc.text(ctx.data.cabinetName, pageW - marginL, cy, { align: 'right' }); cy += 4
  }
  if (ctx.data.cabinetAddress) {
    for (const l of ctx.data.cabinetAddress.split('\n')) { doc.text(l, pageW - marginL, cy, { align: 'right' }); cy += 4 }
  }
  if (ctx.data.cabinetPhone)   { doc.text(ctx.data.cabinetPhone, pageW - marginL, cy, { align: 'right' }); cy += 4 }
  if (ctx.data.cabinetWebsite) { doc.text(ctx.data.cabinetWebsite, pageW - marginL, cy, { align: 'right' }); cy += 4 }
  if (ctx.data.cabinetSupportEmail) { doc.text(ctx.data.cabinetSupportEmail, pageW - marginL, cy, { align: 'right' }); cy += 4 }
  ctx.y += 24

  // Filet doré
  doc.setDrawColor(...GOLD_500); doc.setLineWidth(0.7)
  doc.line(marginL, ctx.y, pageW - marginL, ctx.y)
  ctx.y += 8

  // Date + destinataire
  setText(doc, TEXT_700, 9.5, 'normal')
  doc.text(`Le ${formatDate(new Date().toISOString())}`, pageW - marginL, ctx.y, { align: 'right' })
  ctx.y += 10
  setText(doc, FOREST_900, 10.5, 'bold')
  doc.text(`Direction de ${clientLabel(ctx.data)}`, marginL, ctx.y); ctx.y += 5
  setText(doc, TEXT_500, 8.5, 'normal')
  doc.text('Comité d’audit & instances de gouvernance', marginL, ctx.y); ctx.y += 8

  // Objet
  setText(doc, TEXT_900, 10, 'bold')
  doc.text('Objet :', marginL, ctx.y)
  setText(doc, TEXT_700, 10, 'normal')
  const fwForObjet = frameworkLabel(ctx.data)
  const objetText = fwForObjet === 'le référentiel applicable'
    ? `Rapport d’audit de conformité — Réf. ${ctx.reportRef}`
    : `Rapport d’audit ${fwForObjet} — Réf. ${ctx.reportRef}`
  doc.text(objetText, marginL + 14, ctx.y)
  ctx.y += 8

  // Corps
  const body = generateExecutiveLetterBody(ctx.data)
  for (let i = 0; i < body.length; i++) {
    const w = i === 0 ? 'bold' : 'normal'
    writeWrapped(ctx, body[i], { size: 10, lineHeight: 5.2, weight: w })
    ctx.y += 3.5
  }

  // Bloc signature : Associé prioritaire, sinon Chef de mission
  const sigY = ctx.pageH - 60
  ctx.y = Math.max(ctx.y, sigY - 4)
  const associate = ctx.data.members.find((m) => m.role === 'associate')
  const lead = ctx.data.members.find((m) => m.role === 'lead_auditor')
  const signer = associate ?? lead
  const signerRole = associate ? 'Associé signataire' : 'Chef de mission'
  setText(doc, TEXT_500, 8, 'bold')
  doc.text(`Signature — ${signerRole}`, pageW - marginL, sigY, { align: 'right' })
  doc.setDrawColor(...BORDER); doc.setLineWidth(0.4)
  doc.line(pageW - marginL - 60, sigY + 18, pageW - marginL, sigY + 18)
  setText(doc, FOREST_900, 10.5, 'bold')
  doc.text(signer ? memberName(signer) : '—', pageW - marginL, sigY + 24, { align: 'right' })
  setText(doc, TEXT_500, 8, 'normal')
  doc.text(signerRole, pageW - marginL, sigY + 28, { align: 'right' })
  doc.text(ctx.data.cabinetName, pageW - marginL, sigY + 32, { align: 'right' })
}

// ── Sommaire ──────────────────────────────────────────────────────────────

export function drawTOC(ctx: DocContext): void {
  ctx.doc.addPage()
  ctx.y = 22
  setPageContext(ctx, 'Sommaire')
  ctx.tocPageNumber = ctx.doc.getCurrentPageInfo().pageNumber

  const { doc, marginL, contentW } = ctx
  setText(doc, FOREST_900, 22, 'bold')
  doc.text('Sommaire', marginL, ctx.y); ctx.y += 4
  doc.setDrawColor(...GOLD_500); doc.setLineWidth(0.8)
  doc.line(marginL, ctx.y, marginL + 30, ctx.y); ctx.y += 14

  // Items du sommaire avec leur anchorKey (résolu en numéro de page à la fin
  // via ctx.tocAnchors). On stocke aussi la position y pour pouvoir overwriter
  // le numéro précis dans finalizeTOC.
  const items: { label: string; anchorKey: string }[] = [
    { label: 'Lettre au comité d’audit', anchorKey: 'letter' },
    { label: '01 — Contexte et mandat', anchorKey: '01' },
    { label: '02 — Méthodologie d’audit', anchorKey: '02' },
    { label: '03 — Synthèse exécutive', anchorKey: '03' },
    { label: '04 — Détail par domaine', anchorKey: '04' },
    { label: '05 — Fiches de non-conformités majeures', anchorKey: '05' },
    { label: '06 — Recommandations et matrice de priorisation', anchorKey: '06' },
    { label: '07 — Plan d’action de remédiation', anchorKey: '07' },
    { label: '08 — Conclusion et opinion d’audit', anchorKey: '08' },
    { label: 'Annexe A — Glossaire', anchorKey: 'A' },
    { label: 'Annexe B — Preuves examinées', anchorKey: 'B' },
    { label: 'Annexe C — Références normatives', anchorKey: 'C' },
    { label: 'Annexe D — Liste de diffusion', anchorKey: 'D' },
  ]

  for (const item of items) {
    setText(doc, TEXT_900, 11, 'bold')
    doc.text(item.label, marginL, ctx.y)
    setText(doc, TEXT_400, 10, 'normal')
    // Pointillés (laissent ~14mm pour le numéro à droite)
    const labelW = doc.getTextWidth(item.label)
    let dotsX = marginL + labelW + 3
    while (dotsX < marginL + contentW - 14) { doc.text('.', dotsX, ctx.y); dotsX += 1.6 }
    // Mémoriser la position pour overwrite à la fin
    ctx.tocLines.push({ anchorKey: item.anchorKey, y: ctx.y })
    ctx.y += 7
  }
}

/** Résout les numéros de page des entrées TOC après que toutes les sections aient été dessinées. */
export function finalizeTOC(ctx: DocContext): void {
  if (ctx.tocPageNumber === null) return
  ctx.doc.setPage(ctx.tocPageNumber)
  setText(ctx.doc, FOREST_900, 11, 'bold')

  for (const line of ctx.tocLines) {
    let pageNum: number | null = null
    if (line.anchorKey === 'letter') {
      const a = ctx.tocAnchors.find((x) => x.title.startsWith('Lettre'))
      pageNum = a?.page ?? null
    } else {
      const a = ctx.tocAnchors.find((x) => x.num === line.anchorKey)
      pageNum = a?.page ?? null
    }
    const text = pageNum !== null ? String(pageNum) : '—'
    ctx.doc.text(text, ctx.marginL + ctx.contentW, line.y, { align: 'right' })
  }
}
