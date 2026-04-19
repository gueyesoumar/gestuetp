import { NavLink } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'

const NAV_ITEMS = [
  { to: '/client', label: 'Tableau de bord', icon: '\u2630', end: true },
  { to: '/client/missions', label: 'Mes missions', icon: '\uD83D\uDCCB', end: false },
  { to: '/client/documents', label: 'Documents', icon: '\uD83D\uDCCE', end: false },
  { to: '/client/validations', label: 'Validations', icon: '\u2713', end: false },
  { to: '/client/notifications', label: 'Notifications', icon: '\uD83D\uDD14', end: false },
]

export function ClientSidebar(): JSX.Element {
  const { profile, signOut } = useAuth()
  const initials = profile
    ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`
    : '?'

  return (
    <aside className="w-60 shrink-0 bg-forest-900 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/10">
        <p className="text-lg font-extrabold text-white">
          G{'\u00eb'}stu<span className="text-gold-500">.</span>
        </p>
        <p className="text-[9px] tracking-[2px] uppercase text-white/40 mt-0.5">Portail Client</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-5 py-2.5 text-[13px] transition-colors relative ${
                isActive
                  ? 'text-white bg-white/10'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-gold-500" />
                )}
                <span className="text-[15px] w-5 text-center">{item.icon}</span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-5 py-3 border-t border-white/10 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gold-500 text-forest-900 flex items-center justify-center text-xs font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white font-medium truncate">
            {profile?.first_name} {profile?.last_name}
          </p>
          <button onClick={signOut} className="text-[10px] text-white/40 hover:text-white/70 transition-colors">
            D{'\u00e9'}connexion
          </button>
        </div>
      </div>
    </aside>
  )
}
