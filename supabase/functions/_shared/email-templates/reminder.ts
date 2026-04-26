// Templates HTML branded pour les relances graduées.
// Le rendu reste server-side : aucune interpolation de contenu utilisateur
// sans passer par escapeHtml() pour empêcher l'XSS dans les clients mail.

export type Palier = 'j3' | 'j7' | 'j14'

export interface ReminderContext {
  recipientFirstName: string
  evidenceName: string
  missionName: string
  clientName: string
  controlCode: string | null
  requestedAt: string  // ISO date
  daysOverdue: number
  ageDays: number
  uploadUrl: string
  contactAuditorUrl: string
  unsubscribeUrl: string
}

const PALIER_CONFIG: Record<Palier, {
  subjectPrefix: string
  intro: (firstName: string, name: string) => string
  stripeLabel: string
  stripeText: (ctx: ReminderContext) => string
  stripeColor: { bg: string; text: string; border: string }
  ctaLabel: string
  showContactCta: boolean
  /** Si true, le CTA utilise accent_color du branding au lieu de primary_color */
  useAccentForCta: boolean
}> = {
  j3: {
    subjectPrefix: 'Rappel',
    intro: (firstName, _name) =>
      `Bonjour ${firstName}, nous nous permettons de revenir vers vous concernant un document attendu pour votre mission d'audit.`,
    stripeLabel: 'Information',
    stripeText: () => 'Ce rappel est automatique. Si le document est déjà en cours de préparation, vous pouvez ignorer cet email.',
    stripeColor: { bg: '#EFF6FF', text: '#1D4ED8', border: '#1D4ED8' },
    ctaLabel: 'Déposer le document',
    showContactCta: false,
    useAccentForCta: false,
  },
  j7: {
    subjectPrefix: 'Action requise',
    intro: (firstName, name) =>
      `Bonjour ${firstName}, le document « ${name} » est attendu depuis 7 jours et bloque l'avancement de votre audit.`,
    stripeLabel: 'Action requise',
    stripeText: () => 'Sans dépôt sous 7 jours, l\'auditeur devra clôturer le contrôle concerné en non-conformité par défaut de preuve.',
    stripeColor: { bg: '#FFFBEB', text: '#B45309', border: '#B45309' },
    ctaLabel: 'Déposer le document',
    showContactCta: true,
    useAccentForCta: false,
  },
  j14: {
    subjectPrefix: 'Dernier rappel',
    intro: (firstName, name) =>
      `Bonjour ${firstName}, le document « ${name} » n'a toujours pas été reçu, malgré deux relances précédentes.`,
    stripeLabel: 'Dernier rappel avant escalade',
    stripeText: () => 'Sans dépôt sous 48 h, le contrôle sera clos en non-conformité majeure et la direction de l\'organisation sera informée.',
    stripeColor: { bg: '#FEF2F2', text: '#C0392B', border: '#C0392B' },
    ctaLabel: 'Déposer en urgence',
    showContactCta: true,
    useAccentForCta: true,
  },
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c)
}

export function reminderSubject(palier: Palier, ctx: ReminderContext): string {
  const cfg = PALIER_CONFIG[palier]
  return `${cfg.subjectPrefix} — ${ctx.evidenceName}`
}

export interface ReminderRenderOptions {
  /** Branding cabinet ; si absent, utilise les couleurs Gëstu par défaut */
  branding?: import('../email-branding.ts').CabinetEmailBranding | null
}

export function reminderHtml(palier: Palier, ctx: ReminderContext, options: ReminderRenderOptions = {}): string {
  // Import lazy pour éviter la dépendance circulaire
  // (email-branding.ts utilise déjà escapeHtml depuis ce fichier)
  const branding = options.branding
  // Couleurs effectives
  const primaryColor = branding?.primaryColor ?? '#1B4332'
  const accentColor = branding?.accentColor ?? '#D4A843'
  const cabinetName = branding?.cabinetName ?? 'Gëstu Comply'
  const isWhiteLabel = cabinetName !== 'Gëstu Comply'

  const cfg = PALIER_CONFIG[palier]
  const safe = {
    firstName: escapeHtml(ctx.recipientFirstName),
    evidenceName: escapeHtml(ctx.evidenceName),
    missionName: escapeHtml(ctx.missionName),
    clientName: escapeHtml(ctx.clientName),
    controlCode: ctx.controlCode ? escapeHtml(ctx.controlCode) : null,
    uploadUrl: escapeHtml(ctx.uploadUrl),
    contactAuditorUrl: escapeHtml(ctx.contactAuditorUrl),
    unsubscribeUrl: escapeHtml(ctx.unsubscribeUrl),
    requestedAtFr: new Date(ctx.requestedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    cabinetName: escapeHtml(cabinetName),
    primaryColor: escapeHtml(primaryColor),
    accentColor: escapeHtml(accentColor),
  }

  const intro = escapeHtml(cfg.intro(safe.firstName, ctx.evidenceName))
  const stripeText = escapeHtml(cfg.stripeText(ctx))
  const stripeLabel = escapeHtml(cfg.stripeLabel)

  const overdueLine = ctx.daysOverdue > 0
    ? `<span>Échéance dépassée de <b>${ctx.daysOverdue} j</b></span>`
    : `<span>Demandé il y a <b>${ctx.ageDays} j</b></span>`

  const controlLine = safe.controlCode
    ? `<span>Contrôle <b>${safe.controlCode}</b></span>`
    : ''

  const contactCta = cfg.showContactCta
    ? `<a href="${safe.contactAuditorUrl}" style="margin-left:10px; font-size:13px; color:${safe.primaryColor}; text-decoration:underline">Contacter l'auditeur</a>`
    : ''

  // Header — branded ou défaut Gëstu
  const header = branding ? renderHeaderForBranding(branding) : renderHeaderGestu()

  // Footer
  const supportLine = branding?.supportEmail
    ? `<p style="margin:0 0 6px;">Pour toute question : <a href="mailto:${escapeHtml(branding.supportEmail)}" style="color:${safe.primaryColor}; text-decoration:underline;">${escapeHtml(branding.supportEmail)}</a></p>`
    : ''
  const customFooter = branding?.footerText
    ? `<p style="margin:0 0 6px;">${escapeHtml(branding.footerText)}</p>`
    : ''
  const technicalLine = isWhiteLabel
    ? `<p style="margin:0; color:#9CA3AF; font-size:11px;">${safe.cabinetName} · Powered by Gëstu</p>`
    : `<p style="margin:0; color:#9CA3AF; font-size:11px;">Gëstu Comply · noreply@gestucomply.com</p>`

  const ctaBg = cfg.useAccentForCta ? safe.accentColor : safe.primaryColor
  const ctaText = cfg.useAccentForCta ? safe.primaryColor : '#FFFFFF'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(reminderSubject(palier, ctx))}</title>
</head>
<body style="margin:0; padding:0; background:#FAFAF8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#1A1A1A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAFAF8; padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background:white; border-radius:14px; overflow:hidden; box-shadow:0 4px 12px rgba(27,67,50,0.08); max-width:600px;">
          ${header}

          <!-- Body -->
          <tr>
            <td style="padding:28px;">
              <p style="font-size:14px; line-height:1.65; color:#374151; margin:0 0 18px;">${intro}</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAFAF8; border:1px solid #E5E7EB; border-radius:10px; margin-bottom:16px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <div style="font-weight:700; font-size:14px; color:#1A1A1A; margin-bottom:6px;">${safe.evidenceName}</div>
                    <div style="font-size:12px; color:#6B7280; line-height:1.7;">
                      <span>Demandé le <b style="color:#1A1A1A">${safe.requestedAtFr}</b></span>&nbsp;·&nbsp;
                      ${overdueLine}&nbsp;·&nbsp;
                      <span>Mission <b style="color:#1A1A1A">${safe.missionName}</b></span>
                      ${controlLine ? `&nbsp;·&nbsp;${controlLine}` : ''}
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${cfg.stripeColor.bg}; border-left:3px solid ${cfg.stripeColor.border}; border-radius:8px; margin-bottom:18px;">
                <tr>
                  <td style="padding:12px 14px;">
                    <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.4px; font-weight:700; color:${cfg.stripeColor.text}; margin-bottom:3px;">${stripeLabel}</div>
                    <div style="font-size:13px; line-height:1.55; color:${cfg.stripeColor.text};">${stripeText}</div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 18px; font-size:13.5px; color:#374151;">Vous pouvez déposer le document directement depuis votre espace client :</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:${ctaBg}; border-radius:8px;">
                    <a href="${safe.uploadUrl}" style="display:inline-block; padding:11px 18px; color:${ctaText}; font-weight:700; font-size:13px; text-decoration:none;">${escapeHtml(cfg.ctaLabel)}</a>
                  </td>
                </tr>
              </table>
              ${contactCta ? `<div style="margin-top:14px;">${contactCta}</div>` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#FAFAF8; border-top:1px solid #E5E7EB; padding:18px 28px; font-size:11.5px; color:#6B7280; line-height:1.55;">
              <p style="margin:0 0 6px;">Cet email vous est adressé car vous êtes référent métier sur la mission « ${safe.missionName} »${safe.clientName ? ` (${safe.clientName})` : ''}.</p>
              ${supportLine}
              <p style="margin:0 0 6px;">Vous pouvez <a href="${safe.unsubscribeUrl}" style="color:${safe.primaryColor}; text-decoration:underline;">désactiver les relances</a> à tout moment.</p>
              ${customFooter}
              ${technicalLine}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function renderHeaderGestu(): string {
  return `
          <tr>
            <td style="background:#1B4332; padding:22px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#D4A843; width:36px; height:36px; border-radius:8px; text-align:center; vertical-align:middle; color:#1B4332; font-weight:900; font-size:14px; font-family:Georgia,serif;">G</td>
                  <td style="padding-left:12px; vertical-align:middle;">
                    <div style="color:white; font-weight:800; font-size:15px; letter-spacing:0.3px;">G<span style="color:#D4A843">ë</span>stu</div>
                    <div style="color:#F2E2B1; font-size:11px; text-transform:uppercase; letter-spacing:0.6px; font-weight:600;">Comply</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
}

function renderHeaderForBranding(branding: import('../email-branding.ts').CabinetEmailBranding): string {
  const safeName = escapeHtml(branding.cabinetName)
  const safePrimary = escapeHtml(branding.primaryColor)
  const safeAccent = escapeHtml(branding.accentColor)

  if (branding.logoLightUrl) {
    const safeLogo = escapeHtml(branding.logoLightUrl)
    return `
          <tr>
            <td style="background:${safePrimary}; padding:22px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:white; border-radius:8px; padding:6px 10px; vertical-align:middle;">
                    <img src="${safeLogo}" alt="${safeName}" style="display:block; height:28px; max-width:160px; width:auto;" />
                  </td>
                  <td style="padding-left:14px; vertical-align:middle;">
                    <div style="color:white; font-weight:800; font-size:15px; letter-spacing:0.3px;">${safeName}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
  }

  return `
          <tr>
            <td style="background:${safePrimary}; padding:22px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:${safeAccent}; width:36px; height:36px; border-radius:8px; text-align:center; vertical-align:middle; color:${safePrimary}; font-weight:900; font-size:14px; font-family:Georgia,serif;">${escapeHtml(branding.cabinetName.charAt(0).toUpperCase())}</td>
                  <td style="padding-left:12px; vertical-align:middle;">
                    <div style="color:white; font-weight:800; font-size:15px; letter-spacing:0.3px;">${safeName}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
}
