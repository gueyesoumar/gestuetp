// Templates email pour les actions correctives (CAR)
// 4 templates : created (à génération), accepted, rejected, precision.

function escapeHtml(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface CarEmailContext {
  cabinetName: string
  primaryColor: string
  accentColor: string
  missionName: string
  clientName: string
  carCode: string
  controlLabel: string
  classification: 'major_nc' | 'minor_nc' | 'observation' | string
  description: string
  deadline: string | null
  portalUrl: string
}

const CLASS_LABEL: Record<string, string> = {
  major_nc: 'NC majeure',
  minor_nc: 'NC mineure',
  observation: 'Observation',
}

function shell(ctx: CarEmailContext, body: string, ctaLabel: string, ctaUrl: string): string {
  const primary = escapeHtml(ctx.primaryColor)
  const cabinetName = escapeHtml(ctx.cabinetName)
  const safeCta = escapeHtml(ctaUrl)
  const safeLabel = escapeHtml(ctaLabel)
  return `<!DOCTYPE html>
<html><body style="margin:0; padding:0; background:#F5F4F0; font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F4F0;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px; background:white; border-radius:12px; overflow:hidden;">
        <tr><td style="background:${primary}; padding:22px 28px; color:white; font-weight:700; font-size:15px;">${cabinetName}</td></tr>
        <tr><td style="padding:28px; font-size:14px; color:#1F2937; line-height:1.6;">
          ${body}
          <div style="margin-top:24px;">
            <a href="${safeCta}" style="display:inline-block; background:${primary}; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; font-size:13px;">${safeLabel}</a>
          </div>
        </td></tr>
        <tr><td style="background:#FAFAF8; border-top:1px solid #E5E7EB; padding:16px 28px; font-size:11px; color:#6B7280;">
          ${escapeHtml(ctx.cabinetName)} · Plan d'action — ${escapeHtml(ctx.missionName)} (${escapeHtml(ctx.clientName)})
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function infoBlock(ctx: CarEmailContext): string {
  const cls = CLASS_LABEL[ctx.classification] ?? ctx.classification
  const deadlineLine = ctx.deadline
    ? `<tr><td style="padding:6px 0; color:#6B7280; width:120px;">Échéance</td><td style="padding:6px 0; font-weight:600;">${escapeHtml(ctx.deadline)}</td></tr>`
    : ''
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:14px; margin:16px 0; font-size:13px;">
      <tr><td style="padding:6px 0; color:#6B7280; width:120px;">Référence</td><td style="padding:6px 0; font-weight:700; font-family:monospace; color:${escapeHtml(ctx.primaryColor)};">${escapeHtml(ctx.carCode)}</td></tr>
      <tr><td style="padding:6px 0; color:#6B7280;">Contrôle</td><td style="padding:6px 0;">${escapeHtml(ctx.controlLabel)}</td></tr>
      <tr><td style="padding:6px 0; color:#6B7280;">Type</td><td style="padding:6px 0; font-weight:600;">${escapeHtml(cls)}</td></tr>
      ${deadlineLine}
    </table>
    <p style="margin:12px 0 0; color:#374151; font-size:13px;">${escapeHtml(ctx.description)}</p>`
}

export function renderCARCreatedEmail(ctx: CarEmailContext): { subject: string; html: string } {
  const body = `
    <h1 style="margin:0 0 8px; font-size:18px; color:${escapeHtml(ctx.primaryColor)};">Nouvelle action corrective ${escapeHtml(ctx.carCode)}</h1>
    <p style="margin:0 0 12px;">Suite à l'audit <strong>${escapeHtml(ctx.missionName)}</strong>, une action corrective vous est adressée. Merci de renseigner la cause racine et le plan d'action proposé via le portail.</p>
    ${infoBlock(ctx)}`
  return {
    subject: `[${ctx.cabinetName}] Action corrective ${ctx.carCode} — ${ctx.missionName}`,
    html: shell(ctx, body, 'Répondre dans le portail', ctx.portalUrl),
  }
}

export function renderCARAcceptedEmail(ctx: CarEmailContext): { subject: string; html: string } {
  const body = `
    <h1 style="margin:0 0 8px; font-size:18px; color:#15803D;">Action ${escapeHtml(ctx.carCode)} acceptée</h1>
    <p style="margin:0 0 12px;">Votre réponse à l'action corrective <strong>${escapeHtml(ctx.carCode)}</strong> a été acceptée par l'auditeur. Aucune action complémentaire n'est requise de votre part.</p>
    ${infoBlock(ctx)}`
  return {
    subject: `[${ctx.cabinetName}] Action ${ctx.carCode} acceptée — ${ctx.missionName}`,
    html: shell(ctx, body, 'Voir dans le portail', ctx.portalUrl),
  }
}

interface VerificationContext extends CarEmailContext {
  verifierComment: string
}

export function renderCARRejectedEmail(ctx: VerificationContext): { subject: string; html: string } {
  const body = `
    <h1 style="margin:0 0 8px; font-size:18px; color:#B91C1C;">Action ${escapeHtml(ctx.carCode)} rejetée</h1>
    <p style="margin:0 0 12px;">Votre réponse à l'action corrective <strong>${escapeHtml(ctx.carCode)}</strong> a été rejetée. Vous devez proposer un nouveau plan d'action.</p>
    <div style="background:#FEF2F2; border-left:4px solid #B91C1C; border-radius:4px; padding:12px 14px; margin:12px 0; color:#7F1D1D; font-size:13px;">
      <strong style="display:block; margin-bottom:4px;">Motif du rejet</strong>
      ${escapeHtml(ctx.verifierComment)}
    </div>
    ${infoBlock(ctx)}`
  return {
    subject: `[${ctx.cabinetName}] Action ${ctx.carCode} rejetée — ${ctx.missionName}`,
    html: shell(ctx, body, 'Modifier votre réponse', ctx.portalUrl),
  }
}

export function renderCARPrecisionEmail(ctx: VerificationContext): { subject: string; html: string } {
  const body = `
    <h1 style="margin:0 0 8px; font-size:18px; color:#B45309;">Précision demandée — ${escapeHtml(ctx.carCode)}</h1>
    <p style="margin:0 0 12px;">L'auditeur a demandé une précision complémentaire sur votre réponse à l'action <strong>${escapeHtml(ctx.carCode)}</strong>.</p>
    <div style="background:#FFFBEB; border-left:4px solid #B45309; border-radius:4px; padding:12px 14px; margin:12px 0; color:#78350F; font-size:13px;">
      <strong style="display:block; margin-bottom:4px;">Précision attendue</strong>
      ${escapeHtml(ctx.verifierComment)}
    </div>
    ${infoBlock(ctx)}`
  return {
    subject: `[${ctx.cabinetName}] Précision demandée — ${ctx.carCode} — ${ctx.missionName}`,
    html: shell(ctx, body, 'Compléter votre réponse', ctx.portalUrl),
  }
}
