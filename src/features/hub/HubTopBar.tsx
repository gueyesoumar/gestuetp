import type { User } from '../../types/database.types'
import type { HubPerspective } from './useHubPerspectives'
import { BrandLockup } from './BrandLockup'
import { ViewMenu } from './ViewMenu'
import { HubUserMenu } from './HubUserMenu'

// Barre du haut de l'app-shell : marque à gauche, sélecteur de vues + menu
// utilisateur à droite.

interface HubTopBarProps {
  perspectives: HubPerspective[]
  current: HubPerspective
  onChange: (p: HubPerspective) => void
  profile: User | null
  onSignOut: () => void
  showAdmin: boolean
}

export function HubTopBar({ perspectives, current, onChange, profile, onSignOut, showAdmin }: HubTopBarProps): JSX.Element {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 py-1">
      <BrandLockup />
      <div className="flex items-center gap-3">
        <ViewMenu perspectives={perspectives} value={current} onChange={onChange} />
        {profile && <HubUserMenu profile={profile} onSignOut={onSignOut} showAdmin={showAdmin} />}
      </div>
    </header>
  )
}
