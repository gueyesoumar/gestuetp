import type { User } from '../../types/database.types'
import type { HubPerspective } from './useHubPerspectives'
import { BrandLockup } from './BrandLockup'
import { HubOrgIdentity } from './HubOrgIdentity'
import { ViewMenu } from './ViewMenu'
import { HubUserMenu } from './HubUserMenu'

// Barre du haut de l'app-shell : marque Gëstu + co-branding de l'organisation
// d'appartenance à gauche, sélecteur de vues + menu utilisateur à droite.

interface HubTopBarProps {
  perspectives: HubPerspective[]
  current: HubPerspective
  onChange: (p: HubPerspective) => void
  profile: User | null
  onSignOut: () => void
  showAdmin: boolean
  /** Domaine en marque blanche : la marque cabinet remplace déjà l'identité,
   *  on n'ajoute pas le co-branding org (évite la redondance). */
  isBranded: boolean
}

export function HubTopBar({ perspectives, current, onChange, profile, onSignOut, showAdmin, isBranded }: HubTopBarProps): JSX.Element {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 py-1">
      <div className="flex min-w-0 items-center gap-3">
        <BrandLockup />
        {!isBranded && <HubOrgIdentity />}
      </div>
      <div className="flex items-center gap-3">
        <ViewMenu perspectives={perspectives} value={current} onChange={onChange} />
        {profile && <HubUserMenu profile={profile} onSignOut={onSignOut} showAdmin={showAdmin} />}
      </div>
    </header>
  )
}
