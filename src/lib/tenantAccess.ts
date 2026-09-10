// Drapeau de refus d'accès portail (TenantAccessGuard → LoginPage), via
// sessionStorage : posé avant la déconnexion, consommé au retour sur le login.

const DENIED_FLAG = 'gestu_tenant_denied'

export function setTenantDeniedFlag(): void {
  try {
    sessionStorage.setItem(DENIED_FLAG, '1')
  } catch {
    // navigation privée / stockage indisponible
  }
}

export function consumeTenantDeniedFlag(): boolean {
  try {
    if (sessionStorage.getItem(DENIED_FLAG)) {
      sessionStorage.removeItem(DENIED_FLAG)
      return true
    }
  } catch {
    // ignore
  }
  return false
}
