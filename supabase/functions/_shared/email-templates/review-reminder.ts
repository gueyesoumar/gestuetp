// Template HTML branded pour les rappels de revue périodique (n°18 Lot 2).
// Rendu server-side : tout contenu utilisateur passe par escapeHtml() (anti-XSS).
import { platformBrand } from '../brand.ts'
import type { CabinetEmailBranding } from '../email-branding.ts'

export type ReviewPalier = 'j30' | 'j7' | 'due'

export interface ReviewReminderContext {
  recipientFirstName: string
  assujettiName: string
  frameworkName: string
  dueDate: string // ISO date
  daysUntil: number // négatif si en retard
  reviewUrl: string
  unsubscribeUrl: string
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c)
}

const PALIER: Record<ReviewPalier, {
  subject: (a: string) => string
  intro: (ctx: ReviewReminderContext) => string
  stripeLabel: string
  stripe: (ctx: ReviewReminderContext) => string
  color: { bg: string; text: string; border: string }
}> = {
  j30: {
    subject: (a) => `Revue de conformité à préparer : ${a}`,
    intro: (ctx) => `Bonjour ${ctx.recipientFirstName}, la revue périodique de conformité de ${ctx.assujettiName} (${ctx.frameworkName}) arrive à échéance dans environ un mois.`,
    stripeLabel: 'Information',
    stripe: () => 'Ce rappel est automatique. Vous pouvez dès à présent planifier le prochain contrôle de cet assujetti.',
    color: { bg: '#EFF6FF', text: '#1D4ED8', border: '#1D4ED8' },
  },
  j7: {
    subject: (a) => `Revue de conformité imminente : ${a}`,
    intro: (ctx) => `Bonjour ${ctx.recipientFirstName}, la revue périodique de ${ctx.assujettiName} (${ctx.frameworkName}) est due dans moins de 7 jours.`,
    stripeLabel: 'Action requise',
    stripe: () => 'Planifiez le contrôle de revue afin de respecter la cadence de supervision fixée.',
    color: { bg: '#FFFBEB', text: '#B45309', border: '#B45309' },
  },
  due: {
    subject: (a) => `Revue de conformité en retard : ${a}`,
    intro: (ctx) => `Bonjour ${ctx.recipientFirstName}, la revue périodique de ${ctx.assujettiName} (${ctx.frameworkName}) a dépassé son échéance.`,
    stripeLabel: 'En retard',
    stripe: (ctx) => `L'échéance était le ${new Date(ctx.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}. Lancez le contrôle de revue dès que possible.`,
    color: { bg: '#FEF2F2', text: '#C0392B', border: '#C0392B' },
  },
}

export function reviewSubject(palier: ReviewPalier, ctx: ReviewReminderContext): string {
  return PALIER[palier].subject(ctx.assujettiName)
}

/** Libellé court du palier pour la notification in-app. */
export function reviewInAppLabel(palier: ReviewPalier): string {
  if (palier === 'due') return 'Revue de conformité en retard'
  if (palier === 'j7') return 'Revue de conformité imminente'
  return 'Revue de conformité à préparer'
}

export function reviewReminderHtml(palier: ReviewPalier, ctx: ReviewReminderContext, branding?: CabinetEmailBranding | null): string {
  const cfg = PALIER[palier]
  const primary = branding?.primaryColor ?? '#1B4332'
  const orgName = branding?.cabinetName ?? platformBrand()
  const s = {
    intro: escapeHtml(cfg.intro(ctx)),
    stripe: escapeHtml(cfg.stripe(ctx)),
    stripeLabel: escapeHtml(cfg.stripeLabel),
    assujetti: escapeHtml(ctx.assujettiName),
    framework: escapeHtml(ctx.frameworkName),
    dueFr: escapeHtml(new Date(ctx.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })),
    url: escapeHtml(ctx.reviewUrl),
    unsub: escapeHtml(ctx.unsubscribeUrl),
    org: escapeHtml(orgName),
    primary: escapeHtml(primary),
  }
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(reviewSubject(palier, ctx))}</title></head>
<body style="margin:0; padding:0; background:#FAFAF8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#1A1A1A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAFAF8; padding:32px 12px;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background:white; border-radius:14px; overflow:hidden; box-shadow:0 4px 12px rgba(27,67,50,0.08); max-width:600px;">
      <tr><td style="background:${s.primary}; padding:22px 28px; color:white; font-weight:800; font-size:15px;">${s.org}</td></tr>
      <tr><td style="padding:28px;">
        <p style="font-size:14px; line-height:1.65; color:#374151; margin:0 0 18px;">${s.intro}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAFAF8; border:1px solid #E5E7EB; border-radius:10px; margin-bottom:16px;"><tr><td style="padding:14px 16px;">
          <div style="font-weight:700; font-size:14px; color:#1A1A1A; margin-bottom:6px;">${s.assujetti}</div>
          <div style="font-size:12px; color:#6B7280; line-height:1.7;"><span>Référentiel <b style="color:#1A1A1A">${s.framework}</b></span>&nbsp;·&nbsp;<span>Échéance <b style="color:#1A1A1A">${s.dueFr}</b></span></div>
        </td></tr></table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${cfg.color.bg}; border-left:3px solid ${cfg.color.border}; border-radius:8px; margin-bottom:18px;"><tr><td style="padding:12px 14px;">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.4px; font-weight:700; color:${cfg.color.text}; margin-bottom:3px;">${s.stripeLabel}</div>
          <div style="font-size:13px; line-height:1.55; color:${cfg.color.text};">${s.stripe}</div>
        </td></tr></table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${s.primary}; border-radius:8px;">
          <a href="${s.url}" style="display:inline-block; padding:11px 18px; color:#FFFFFF; font-weight:700; font-size:13px; text-decoration:none;">Ouvrir la fiche assujetti</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="background:#FAFAF8; border-top:1px solid #E5E7EB; padding:18px 28px; font-size:11.5px; color:#6B7280; line-height:1.55;">
        <p style="margin:0 0 6px;">Cet email vous est adressé car vous supervisez cet assujetti.</p>
        <p style="margin:0 0 6px;">Vous pouvez <a href="${s.unsub}" style="color:${s.primary}; text-decoration:underline;">désactiver les relances</a> à tout moment.</p>
        <p style="margin:0; color:#9CA3AF; font-size:11px;">${s.org} · Powered by Gëstu</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
