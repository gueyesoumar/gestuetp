/**
 * HubUserBar — user info bar at bottom of the Hub page.
 */

import { LogOut } from 'lucide-react'
import type { User } from '../../types/database.types'

interface HubUserBarProps {
  profile: User
  onSignOut: () => void
}

export function HubUserBar({ profile, onSignOut }: HubUserBarProps): JSX.Element {
  const initials = `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`
  const roleName = profile.role === 'auditor' ? 'Auditeur' : 'Client'

  return (
    <div className="flex items-center justify-center gap-4 border-t border-white/8 py-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[13px] font-semibold text-white">
        {initials}
      </div>
      <div className="text-left">
        <p className="text-[13px] font-medium text-white/80">
          {profile.first_name} {profile.last_name}
        </p>
        <p className="text-[11px] text-white/30">{roleName}</p>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="ml-2 rounded-lg p-2 text-white/20 transition-colors hover:bg-white/5 hover:text-white/50"
        title="D&eacute;connexion"
      >
        <LogOut size={16} />
      </button>
    </div>
  )
}
