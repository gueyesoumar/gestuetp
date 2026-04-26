const RESEND_API_URL = 'https://api.resend.com/emails'

interface SendEmailParams {
  to: string
  subject: string
  html: string
  /** "Audit&Co Sénégal via Gëstu <noreply@gestugroup.com>" ou défaut Gëstu */
  from?: string
  /** Reply-To pour rediriger les réponses vers le support cabinet */
  replyTo?: string
}

interface ResendResponse {
  id?: string
  error?: string
}

export async function sendEmail({ to, subject, html, from, replyTo }: SendEmailParams): Promise<ResendResponse> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    console.error('[resend] RESEND_API_KEY non configurée')
    return { error: 'RESEND_API_KEY manquante' }
  }

  const senderEmail = from ?? Deno.env.get('RESEND_FROM_EMAIL') ?? 'Gëstu Comply <noreply@gestugroup.com>'

  const payload: Record<string, unknown> = {
    from: senderEmail,
    to: [to],
    subject,
    html,
  }
  if (replyTo) {
    payload.reply_to = [replyTo]
  }

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[resend] Erreur envoi:', res.status, body)
    return { error: `Erreur Resend: ${res.status}` }
  }

  const data = await res.json()
  return { id: data.id }
}
