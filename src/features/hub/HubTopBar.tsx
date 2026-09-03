import type { User } from '../../types/database.types'
import type { HubPerspective } from './useHubPerspectives'
import { BrandLockup } from './BrandLockup'
import { HubOrgIdentity } from './HubOrgIdentity'
import { HubUserMenu } from './HubUserMenu'

// Barre du haut de l'app-shell : marque Gëstu + co-branding de l'organisation
// à gauche ; onglets de vue (Lanceur / Ma posture / portefeuille) + menu
// utilisateur à droite. Les onglets remplacent l'ancien menu déroulant « Vue ».

export type HubView = 'launcher' | HubPerspective

const VIEW_LABEL: Record<HubView, string> = {
  launcher: 'Lanceur',
  self: 'Ma posture',
  clients: 'Clients',
  group: 'Filiales',
  assujettis: 'Assujettis',
}

interface HubTopBarProps {
  views: HubView[]
  current: HubView
  onChange: (v: HubView) => void
  profile: User | null
  onSignOut: () => void
  showAdmin: boolean
  /** Domaine en marque blanche : la marque cabinet remplace déjà l'identité. */
  isBranded: boolean
}

export function HubTopBar({ views, current, onChange, profile, onSignOut, showAdmin, isBranded }: HubTopBarProps): JSX.Element {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 py-1">
      <div className="flex min-w-0 items-center gap-3">
        <BrandLockup />
        {!isBranded && <HubOrgIdentity />}
      </div>
      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                v === current ? 'bg-[#D4A843] text-[#1B4332]' : 'text-white/60 hover:text-white'
              }`}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </nav>
        {profile && <HubUserMenu profile={profile} onSignOut={onSignOut} showAdmin={showAdmin} />}
      </div>
    </header>
  )
}
