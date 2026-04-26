// deno-lint-ignore-file no-explicit-any
import { escapeHtml } from './email-templates/reminder.ts'

/**
 * Branding email pour la marque blanche cabinet.
 *
 * Logique de résolution :
 *   1. Si le flag white_label_branding est OFF pour le cabinet → defaultBranding() (Gëstu)
 *   2. Sinon, si organization_branding existe → branding cabinet (logos, couleurs, signature)
 *   3. Tous les champs sont nullable : on tombe toujours en fallback Gëstu propre
 *
 * Sécurité : tous les champs branding sont escapés via escapeHtml() avant
 * inclusion dans le HTML email — la table organization_branding peut contenir
 * des chaînes saisies par le super-admin, donc on ne fait jamais confiance.
 */

export interface CabinetEmailBranding {
  cabinetName: string
  logoLightUrl: string | null
  primaryColor: string
  accentColor: string
  supportEmail: string | null
  emailFromName: string | null
  footerText: string | null
}

const GESTU_DEFAULTS = {
  cabinetName: 'Gëstu Comply',
  primaryColor: '#1B4332',
  accentColor: '#D4A843',
  logoLightUrl: null as string | null,
  supportEmail: null as string | null,
  emailFromName: null as string | null,
  footerText: null as string | null,
}

export function defaultBranding(): CabinetEmailBranding {
  return { ...GESTU_DEFAULTS }
}

/**
 * Charge le branding email du cabinet, ou retourne null si white_label_branding
 * est OFF pour ce cabinet (auquel cas l'appelant utilise defaultBranding()).
 */
export async function loadCabinetEmailBranding(
  admin: any,
  cabinetId: string,
): Promise<CabinetEmailBranding | null> {
  if (!cabinetId) return null

  // 1. Le flag doit être ON pour ce cabinet
  const { data: flag } = await admin
    .from('feature_flags')
    .select('id, is_globally_enabled')
    .eq('slug', 'white_label_branding')
    .maybeSingle()
  if (!flag) return null
  const f = flag as { id: string; is_globally_enabled: boolean }

  const { data: override } = await admin
    .from('feature_flag_overrides')
    .select('enabled')
    .eq('flag_id', f.id)
    .eq('organization_id', cabinetId)
    .maybeSingle()
  const o = override as { enabled: boolean } | null
  const enabled = o?.enabled ?? f.is_globally_enabled
  if (!enabled) return null

  // 2. Charger organization_branding + nom du cabinet
  const [{ data: branding }, { data: org }] = await Promise.all([
    admin
      .from('organization_branding')
      .select('logo_light_url, primary_color, accent_color, support_email, email_from_name, footer_text')
      .eq('organization_id', cabinetId)
      .maybeSingle(),
    admin
      .from('organizations')
      .select('id, name')
      .eq('id', cabinetId)
      .single(),
  ])

  const o2 = org as { id: string; name: string } | null
  if (!o2) return null

  const b = branding as {
    logo_light_url: string | null
    primary_color: string | null
    accent_color: string | null
    support_email: string | null
    email_from_name: string | null
    footer_text: string | null
  } | null

  return {
    cabinetName: o2.name,
    logoLightUrl: b?.logo_light_url ?? null,
    primaryColor: b?.primary_color ?? GESTU_DEFAULTS.primaryColor,
    accentColor: b?.accent_color ?? GESTU_DEFAULTS.accentColor,
    supportEmail: b?.support_email ?? null,
    emailFromName: b?.email_from_name ?? null,
    footerText: b?.footer_text ?? null,
  }
}

/**
 * Calcule le from-name à utiliser dans l'enveloppe Resend.
 *  - Si branding.emailFromName défini → "Audit&Co Sénégal via Gëstu <noreply@gestucomply.com>"
 *  - Sinon → "Gëstu Comply <noreply@gestucomply.com>" (default Resend)
 */
export function buildEmailFrom(branding: CabinetEmailBranding | null): string | undefined {
  if (!branding?.emailFromName) return undefined
  const sender = Deno.env.get('RESEND_FROM_EMAIL_ADDRESS') ?? 'noreply@gestucomply.com'
  // Quote le display name si caractères spéciaux
  const safeName = branding.emailFromName.replace(/"/g, '\\"')
  return `"${safeName}" <${sender}>`
}

/**
 * Render du header email selon le branding. Si logoLightUrl absent, on garde
 * un header textuel simple à la place de l'image — pas de carré blanc, pas
 * de fallback hasardeux.
 */
export function renderEmailHeader(branding: CabinetEmailBranding): string {
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

  // Fallback texte (sans logo) — utilise les couleurs du cabinet
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

/**
 * Render du footer email selon le branding. supportEmail et footerText
 * personnalisés si fournis ; sinon, défaut Gëstu.
 *
 * La mention "Powered by Gëstu" est obligatoire dès qu'on est en branding
 * cabinet (cabinetName !== "Gëstu Comply") — non négociable contractuellement.
 */
export function renderEmailFooter(
  branding: CabinetEmailBranding,
  missionName: string,
  clientName: string,
  unsubscribeUrl: string,
): string {
  const safeMission = escapeHtml(missionName)
  const safeClient = escapeHtml(clientName)
  const safeUnsub = escapeHtml(unsubscribeUrl)
  const isWhiteLabel = branding.cabinetName !== 'Gëstu Comply'
  const safeName = escapeHtml(branding.cabinetName)
  const safePrimary = escapeHtml(branding.primaryColor)

  const supportLine = branding.supportEmail
    ? `<p style="margin:0 0 6px;">Pour toute question : <a href="mailto:${escapeHtml(branding.supportEmail)}" style="color:${safePrimary}; text-decoration:underline;">${escapeHtml(branding.supportEmail)}</a></p>`
    : ''

  const customFooter = branding.footerText
    ? `<p style="margin:0 0 6px;">${escapeHtml(branding.footerText)}</p>`
    : ''

  const reasonLine = `<p style="margin:0 0 6px;">Cet email vous est adressé car vous êtes référent métier sur la mission « ${safeMission} »${safeClient ? ` (${safeClient})` : ''}.</p>`
  const unsubLine = `<p style="margin:0 0 6px;">Vous pouvez <a href="${safeUnsub}" style="color:${safePrimary}; text-decoration:underline;">désactiver les relances</a> à tout moment.</p>`

  const technicalLine = isWhiteLabel
    ? `<p style="margin:0; color:#9CA3AF; font-size:11px;">${safeName} · Powered by Gëstu</p>`
    : `<p style="margin:0; color:#9CA3AF; font-size:11px;">Gëstu Comply · noreply@gestucomply.com</p>`

  return `
    <tr>
      <td style="background:#FAFAF8; border-top:1px solid #E5E7EB; padding:18px 28px; font-size:11.5px; color:#6B7280; line-height:1.55;">
        ${reasonLine}
        ${supportLine}
        ${unsubLine}
        ${customFooter}
        ${technicalLine}
      </td>
    </tr>`
}
