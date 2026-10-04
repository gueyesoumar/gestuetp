// Vérification côté client « mot de passe présent dans une fuite connue » via
// Have I Been Pwned (k-anonymity : seuls les 5 premiers caractères du SHA-1 sont
// envoyés — jamais le mot de passe). Miroir de la vérif serveur (_shared/password-policy.ts),
// pour un retour EN DIRECT dans le formulaire. Fail-open : en cas d'erreur réseau,
// on ne bloque pas (la validation serveur reste l'autorité).

async function sha1HexUpper(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-1', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

export async function isPwnedPassword(password: string, signal?: AbortSignal): Promise<boolean> {
  if (!password) return false
  try {
    const hash = await sha1HexUpper(password)
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal,
    })
    if (!res.ok) return false
    const body = await res.text()
    for (const line of body.split('\n')) {
      const [suf, countStr] = line.trim().split(':')
      if (suf === suffix && Number(countStr) > 0) return true
    }
    return false
  } catch {
    return false
  }
}
