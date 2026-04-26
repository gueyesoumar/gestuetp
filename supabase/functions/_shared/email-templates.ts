import { escapeHtml } from './email-templates/reminder.ts'
import { defaultBranding, renderEmailHeader, type CabinetEmailBranding } from './email-branding.ts'

export interface ClientInviteParams {
  contactName: string
  cabinetName: string
  missionTitle: string
  inviteLink: string
  branding?: CabinetEmailBranding | null
}

export function clientInviteTemplate(params: ClientInviteParams): string {
  const { contactName, cabinetName, missionTitle, inviteLink, branding } = params
  const effective = branding ?? defaultBranding()
  const isWhiteLabel = effective.cabinetName !== 'Gëstu Comply'

  const safeContact = escapeHtml(contactName)
  const safeCabinet = escapeHtml(cabinetName)
  const safeMission = escapeHtml(missionTitle)
  const safeLink = escapeHtml(inviteLink)
  const safePrimary = escapeHtml(effective.primaryColor)
  const safeAccent = escapeHtml(effective.accentColor)

  const header = renderEmailHeader(effective)
  const portalLabel = isWhiteLabel ? 'Portail Client' : 'Portail Client Gëstu Comply'
  const safePortalLabel = escapeHtml(portalLabel)

  const technicalFooter = isWhiteLabel
    ? `<p style="margin:0;font-size:11px;color:#9CA3AF;">${escapeHtml(effective.cabinetName)} &mdash; Powered by G&euml;stu</p>`
    : `<p style="margin:0;font-size:11px;color:#9CA3AF;">&copy; G&euml;stu Comply &mdash; Plateforme d&rsquo;audit et de conformit&eacute;</p>`

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAFAF8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF8;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  ${header}
  <tr><td style="background:${safePrimary};padding:0 28px 14px;">
    <p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.55);">${safePortalLabel}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#1A1A1A;">Bonjour ${safeContact},</p>

    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#374151;">
      <strong>${safeCabinet}</strong> vous invite &agrave; acc&eacute;der au portail client pour la mission :
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#F0FFF4;border:1px solid #D8F3DC;border-radius:10px;">
    <tr><td style="padding:16px 20px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:${safePrimary};">${safeMission}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#40916C;">Cabinet : ${safeCabinet}</p>
    </td></tr>
    </table>

    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#374151;">
      Sur le portail, vous pourrez :
    </p>
    <ul style="margin:0 0 24px;padding-left:20px;font-size:13px;line-height:2;color:#374151;">
      <li>D&eacute;poser les documents demand&eacute;s</li>
      <li>R&eacute;pondre au questionnaire de prise de connaissance</li>
      <li>Confirmer les cr&eacute;neaux d&rsquo;entretien</li>
      <li>Valider les constats d&rsquo;audit</li>
      <li>Suivre votre plan d&rsquo;action</li>
    </ul>

    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:8px 0 24px;">
      <a href="${safeLink}" style="display:inline-block;padding:14px 36px;background:${safePrimary};color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
        D&eacute;finir mon mot de passe &rarr;
      </a>
    </td></tr>
    </table>

    <p style="margin:0 0 8px;font-size:12px;color:#9CA3AF;">Ce lien est valable 24 heures. Si vous n&rsquo;avez pas demand&eacute; cet acc&egrave;s, ignorez cet email.</p>
    <p style="margin:0;font-size:12px;color:#9CA3AF;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
    <p style="margin:4px 0 0;font-size:11px;color:${safeAccent};word-break:break-all;">${safeLink}</p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#FAFAF8;padding:20px 40px;border-top:1px solid #E5E7EB;text-align:center;">
    ${effective.supportEmail ? `<p style="margin:0 0 6px;font-size:11px;color:#6B7280;">Support : <a href="mailto:${escapeHtml(effective.supportEmail)}" style="color:${safePrimary};">${escapeHtml(effective.supportEmail)}</a></p>` : ''}
    ${technicalFooter}
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
