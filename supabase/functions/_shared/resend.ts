const RESEND_API_URL = 'https://api.resend.com/emails'

interface SendEmailParams {
  to: string
  subject: string
  html: string
  from?: string
}

interface ResendResponse {
  id?: string
  error?: string
}

export async function sendEmail({ to, subject, html, from }: SendEmailParams): Promise<ResendResponse> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    console.error('[resend] RESEND_API_KEY non configurée')
    return { error: 'RESEND_API_KEY manquante' }
  }

  const senderEmail = from ?? Deno.env.get('RESEND_FROM_EMAIL') ?? 'Gëstu Comply <noreply@gestucomply.com>'

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from: senderEmail, to: [to], subject, html }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[resend] Erreur envoi:', res.status, body)
    return { error: `Erreur Resend: ${res.status}` }
  }

  const data = await res.json()
  return { id: data.id }
}
