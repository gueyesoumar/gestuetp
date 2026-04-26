import { escapeHtml } from './reminder.ts'

/**
 * Templates emails pour les flows d'authentification admin :
 *  - cabinetOwnerInviteTemplate : envoyé au 1er owner d'un cabinet créé via /admin
 *  - passwordResetTemplate      : envoyé sur action "Réinitialiser le mot de passe"
 *
 * Ces emails sortent toujours en branding Gëstu Comply (admin platform side),
 * pas en marque blanche cabinet — l'audit log et la traçabilité supposent
 * que c'est Gëstu qui invite/réinitialise.
 */

const PRIMARY = '#1B4332'
const ACCENT = '#D4A843'

interface CabinetOwnerInviteParams {
  firstName: string
  cabinetName: string
  link: string
}

export function cabinetOwnerInviteTemplate({ firstName, cabinetName, link }: CabinetOwnerInviteParams): string {
  const safeFirst = escapeHtml(firstName)
  const safeCabinet = escapeHtml(cabinetName)
  const safeLink = escapeHtml(link)
  return baseTemplate({
    title: 'Bienvenue sur Gëstu Comply',
    intro: `Bonjour ${safeFirst},`,
    body: `Votre compte d'administration pour le cabinet <strong>${safeCabinet}</strong> vient d'être créé sur Gëstu Comply. Définissez votre mot de passe pour vous connecter et commencer à configurer votre espace.`,
    ctaLabel: 'Définir mon mot de passe',
    ctaLink: safeLink,
    expiry: 'Ce lien est valable 24 heures.',
  })
}

interface PasswordResetParams {
  firstName: string
  link: string
}

export function passwordResetTemplate({ firstName, link }: PasswordResetParams): string {
  const safeFirst = escapeHtml(firstName)
  const safeLink = escapeHtml(link)
  return baseTemplate({
    title: 'Réinitialisation de votre mot de passe',
    intro: `Bonjour ${safeFirst},`,
    body: `Une demande de réinitialisation de mot de passe a été initiée pour votre compte Gëstu Comply. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe actuel reste inchangé.`,
    ctaLabel: 'Réinitialiser mon mot de passe',
    ctaLink: safeLink,
    expiry: 'Ce lien est valable 1 heure.',
  })
}

interface BaseParams {
  title: string
  intro: string
  body: string
  ctaLabel: string
  ctaLink: string
  expiry: string
}

function baseTemplate({ title, intro, body, ctaLabel, ctaLink, expiry }: BaseParams): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAFAF8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF8;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  <tr><td style="background:${PRIMARY};padding:24px 28px;">
    <table cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background:${ACCENT};width:36px;height:36px;border-radius:8px;text-align:center;vertical-align:middle;color:${PRIMARY};font-weight:900;font-size:14px;font-family:Georgia,serif;">G</td>
        <td style="padding-left:12px;vertical-align:middle;">
          <div style="color:white;font-weight:800;font-size:15px;letter-spacing:0.3px;">G<span style="color:${ACCENT}">ë</span>stu</div>
          <div style="color:#F2E2B1;font-size:11px;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Comply</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="padding:36px 40px;">
    <h2 style="margin:0 0 20px;font-size:18px;color:#1A1A1A;">${escapeHtml(title)}</h2>
    <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#1A1A1A;">${intro}</p>
    <p style="margin:0 0 22px;font-size:14px;line-height:1.7;color:#374151;">${body}</p>

    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:8px 0 24px;">
      <a href="${ctaLink}" style="display:inline-block;padding:14px 32px;background:${PRIMARY};color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
        ${escapeHtml(ctaLabel)} &rarr;
      </a>
    </td></tr>
    </table>

    <p style="margin:0 0 8px;font-size:12px;color:#9CA3AF;">${escapeHtml(expiry)}</p>
    <p style="margin:0;font-size:12px;color:#9CA3AF;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
    <p style="margin:4px 0 0;font-size:11px;color:${ACCENT};word-break:break-all;">${ctaLink}</p>
  </td></tr>

  <tr><td style="background:#FAFAF8;padding:18px 40px;border-top:1px solid #E5E7EB;text-align:center;">
    <p style="margin:0;font-size:11px;color:#9CA3AF;">&copy; G&euml;stu Comply &mdash; Plateforme d&rsquo;audit et de conformit&eacute;</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
