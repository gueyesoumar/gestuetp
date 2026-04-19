export function clientInviteTemplate(params: {
  contactName: string
  cabinetName: string
  missionTitle: string
  inviteLink: string
}): string {
  const { contactName, cabinetName, missionTitle, inviteLink } = params

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAFAF8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF8;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  <!-- Header -->
  <tr><td style="background:#1B4332;padding:28px 40px;text-align:center;">
    <p style="margin:0;font-size:22px;font-weight:800;color:#FFFFFF;">G&euml;stu<span style="color:#D4A843;">.</span></p>
    <p style="margin:4px 0 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.5);">Portail Client</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#1A1A1A;">Bonjour ${contactName},</p>

    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#374151;">
      <strong>${cabinetName}</strong> vous invite &agrave; acc&eacute;der au portail client G&euml;stu Comply pour la mission :
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#F0FFF4;border:1px solid #D8F3DC;border-radius:10px;">
    <tr><td style="padding:16px 20px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#1B4332;">${missionTitle}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#40916C;">Cabinet : ${cabinetName}</p>
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
      <a href="${inviteLink}" style="display:inline-block;padding:14px 36px;background:#1B4332;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
        D&eacute;finir mon mot de passe &rarr;
      </a>
    </td></tr>
    </table>

    <p style="margin:0 0 8px;font-size:12px;color:#9CA3AF;">Ce lien est valable 24 heures. Si vous n&rsquo;avez pas demand&eacute; cet acc&egrave;s, ignorez cet email.</p>
    <p style="margin:0;font-size:12px;color:#9CA3AF;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
    <p style="margin:4px 0 0;font-size:11px;color:#D4A843;word-break:break-all;">${inviteLink}</p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#FAFAF8;padding:20px 40px;border-top:1px solid #E5E7EB;text-align:center;">
    <p style="margin:0;font-size:11px;color:#9CA3AF;">&copy; G&euml;stu Comply &mdash; Plateforme d&rsquo;audit et de conformit&eacute;</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
