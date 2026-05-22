import { BORDER, FOREST_50, FOREST_700, FOREST_900, GOLD_50, GOLD_500, TEXT_400, TEXT_500, TEXT_700, TEXT_900, WHITE } from './colors'
import type { DocContext } from './context'
import type { LogoData } from './logo-loader'
import { drawKpi, fillRect, fillRoundedRect, setText, strokeRoundedRect } from './primitives'
import { formatDate, generateContextSummary } from './narratives'

// ── Cover page ─────────────────────────────────────────────────────────────

export function drawCoverPage(ctx: DocContext, clientLogo: LogoData | null): void {
  const { doc, data, pageW, pageH, marginL } = ctx
  const contentW = pageW - marginL - ctx.marginR

  // Hero band
  fillRect(doc, 0, 0, pageW, 100, FOREST_900)
  fillRect(doc, 0, 100, pageW, 1.5, GOLD_500)

  // Logo client en haut à droite (si disponible). Fond blanc arrondi pour
  // garantir la lisibilité quel que soit le coloris du logo.
  if (clientLogo) {
    const maxW = 30
    const maxH = 18
    const ratio = clientLogo.width / clientLogo.height
    let lw = maxW
    let lh = maxW / ratio
    if (lh > maxH) {
      lh = maxH
      lw = maxH * ratio
    }
    const padding = 2
    const boxW = lw + padding * 2
    const boxH = lh + padding * 2
    const boxX = pageW - ctx.marginR - boxW
    const boxY = 14
    fillRoundedRect(doc, boxX, boxY, boxW, boxH, 1, WHITE)
    try {
      doc.addImage(clientLogo.dataUrl, clientLogo.format, boxX + padding, boxY + padding, lw, lh)
    } catch (err) {
      // Format non supporté par jsPDF (ex: SVG) — on a déjà le carré blanc, tant pis pour le visuel
      console.warn('[scoping-pdf] addImage failed:', err)
    }
  }

  // Mission ID pill
  const idLabel = `MISSION · ${data.mission.id.slice(0, 8)} · v1.0`
  setText(doc, GOLD_500, 7.5, 'bold')
  doc.text(idLabel, marginL, 22)

  // Logo
  setText(doc, WHITE, 22, 'bold')
  doc.text('Gëstu', marginL, 36)
  setText(doc, GOLD_500, 7.5, 'bold')
  doc.text('COMPLY', marginL + doc.getTextWidth('Gëstu') + 3, 36)

  // Title
  setText(doc, WHITE, 24, 'bold')
  doc.text('Note de cadrage', marginL, 58)

  // Subtitle
  const fwName = `${data.mission.framework?.name ?? '—'}${data.mission.framework?.version ? ' v' + data.mission.framework.version : ''}`
  const subtitle = doc.splitTextToSize(
    `Évaluation de la conformité du Système de Management de la Sécurité de l'Information aux exigences du référentiel ${fwName}.`,
    contentW,
  ) as string[]
  setText(doc, WHITE, 11, 'normal')
  let sy = 68
  for (const line of subtitle.slice(0, 3)) {
    doc.text(line, marginL, sy)
    sy += 5
  }

  // Client row
  const clientName = data.client?.client_name ?? data.mission.client?.name ?? '—'
  const initial = (clientName[0] ?? '?').toUpperCase()
  // Avatar
  doc.setFillColor(...GOLD_500)
  doc.circle(marginL + 5, 90, 5, 'F')
  setText(doc, FOREST_900, 11, 'bold')
  doc.text(initial, marginL + 5, 92, { align: 'center' })
  setText(doc, WHITE, 11, 'bold')
  doc.text(clientName, marginL + 13, 90)
  const clientMeta: string[] = []
  if (data.client?.client_sector) clientMeta.push(data.client.client_sector)
  if (data.client?.effectifs) clientMeta.push(`${data.client.effectifs} collaborateurs`)
  if (data.client?.client_country) clientMeta.push(data.client.client_country)
  setText(doc, [220, 220, 220], 8.5, 'normal')
  doc.text(clientMeta.join(' · ') || '—', marginL + 13, 95)

  // KPI strip — overlapping the hero
  const kpiY = 110
  const kpiH = 28
  fillRoundedRect(doc, marginL, kpiY, contentW, kpiH, 2, WHITE)
  strokeRoundedRect(doc, marginL, kpiY, contentW, kpiH, 2, BORDER)
  const kpiW = contentW / 4
  drawKpi(doc, marginL, kpiY, kpiW, kpiH, 'Contrôles', String(ctx.includedControls), `/ ${ctx.totalControls}`)
  drawKpi(doc, marginL + kpiW, kpiY, kpiW, kpiH, 'Domaines', String(data.domains.length), 'évalués')
  drawKpi(doc, marginL + kpiW * 2, kpiY, kpiW, kpiH, 'Équipe', String(data.members.length), 'membres')
  drawKpi(doc, marginL + kpiW * 3, kpiY, kpiW, kpiH, 'Durée', `${ctx.durationWeeks}`, 'semaines')

  // Tags
  let tagY = 152
  let tagX = marginL
  const tags: string[] = []
  if (data.mission.framework?.name) tags.push(`${data.mission.framework.name}${data.mission.framework.version ? ' v' + data.mission.framework.version : ''}`)
  if (data.client?.client_sector) tags.push(data.client.client_sector)
  for (const reg of data.client?.exigences_reglementaires?.slice(0, 3) ?? []) {
    tags.push(reg.nom)
  }
  for (const tag of tags) {
    setText(doc, FOREST_700, 8, 'bold')
    const w = doc.getTextWidth(tag) + 6
    if (tagX + w > marginL + contentW) {
      tagX = marginL
      tagY += 7
    }
    fillRoundedRect(doc, tagX, tagY - 4, w, 6, 3, FOREST_50)
    doc.text(tag, tagX + 3, tagY)
    tagX += w + 2
  }

  // Foot — cabinet + contexte
  const footY = 188
  fillRect(doc, marginL, footY, contentW, 0.3, BORDER)
  // Cabinet
  setText(doc, TEXT_500, 7.5, 'bold')
  doc.text('CABINET D\'AUDIT', marginL, footY + 7)
  setText(doc, TEXT_900, 11, 'bold')
  doc.text(data.mission.cabinet?.name ?? '—', marginL, footY + 13)
  const lead = data.members.find((m) => m.role === 'lead_auditor')
  const associate = data.members.find((m) => m.role === 'associate')
  setText(doc, TEXT_500, 8.5, 'normal')
  if (associate) doc.text(`${associate.user.first_name} ${associate.user.last_name} — ${ctx.roleLabel('associate')}`, marginL, footY + 19)
  if (lead) doc.text(`${lead.user.first_name} ${lead.user.last_name} — ${ctx.roleLabel('lead_auditor')}`, marginL, footY + 24)

  // Contexte
  setText(doc, TEXT_500, 7.5, 'bold')
  doc.text('CONTEXTE DE LA MISSION', marginL + contentW / 2, footY + 7)
  const ctxText = generateContextSummary(data)
  setText(doc, TEXT_700, 9, 'normal')
  const ctxLines = doc.splitTextToSize(ctxText, contentW / 2 - 3) as string[]
  let cy = footY + 13
  for (const line of ctxLines.slice(0, 5)) {
    doc.text(line, marginL + contentW / 2, cy)
    cy += 4
  }

  // Classification
  fillRoundedRect(doc, marginL, pageH - 30, contentW, 10, 1.5, GOLD_50)
  setText(doc, GOLD_500, 8, 'bold')
  doc.text('CONFIDENTIEL', marginL + 4, pageH - 24)
  setText(doc, [138, 109, 44], 8, 'normal')
  doc.text('· Distribution restreinte aux parties prenantes de la mission', marginL + 4 + doc.getTextWidth('CONFIDENTIEL') + 1, pageH - 24)

  // Footer
  setText(doc, TEXT_400, 7, 'normal')
  doc.text(`Document généré le ${formatDate(new Date().toISOString())}`, marginL, pageH - 10)
}
