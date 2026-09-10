import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Paperclip, Bell, LifeBuoy, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useVocab } from '../../edition/useVocab'
import { useIsRegul } from '../../edition/useIsRegul'
import { useCapability } from '../../edition/EditionContext'
import { useBranding } from '../../branding/useBranding'
import { effectiveSurface } from '../../branding/surface'
import { GestuLogo } from '../../../components/GestuLogo'
import { Logo } from '../../branding/Logo'
import type { ReactNode } from 'react'

type NavItem = { to: string; label: string; icon: ReactNode; end: boolean }

export function ClientSidebar(): JSX.Element {
  const vocab = useVocab()
  const isRegul = useIsRegul()
  const hasIncidents = useCapability('incidents')
  const { profile, signOut } = useAuth()
  const { branding } = useBranding()

  // Polarité de la surface brandée (marque blanche). Sur un cabinet en mode clair,
  // la sidebar passe en clair pour que le logo (à traits foncés) s'y pose tel quel.
  const isBranded = Boolean(branding)
  const isLight = branding != null && effectiveSurface(branding, 'portal') === 'light'

  const ink = isLight ? 'text-gray-800' : 'text-white'
  const inkFaint = isLight ? 'text-gray-400' : 'text-white/40'
  const borderCol = isLight ? 'border-black/10' : 'border-white/10'
  const activeCls = isLight ? 'text-gray-900 bg-black/[0.06]' : 'text-white bg-white/10'
  const idleCls = isLight ? 'text-gray-500 hover:text-gray-800 hover:bg-black/[0.04]' : 'text-white/50 hover:text-white/80 hover:bg-white/5'

  const navItems: NavItem[] = [
    { to: '/client', label: 'Tableau de bord', icon: <LayoutDashboard size={16} />, end: true },
    { to: '/client/missions', label: 'Mes missions', icon: <ClipboardList size={16} />, end: false },
    ...(hasIncidents ? [{ to: '/client/incidents', label: 'Incidents', icon: <AlertTriangle size={16} />, end: false }] : []),
    { to: '/client/documents', label: 'Documents', icon: <Paperclip size={16} />, end: false },
    { to: '/client/notifications', label: 'Notifications', icon: <Bell size={16} />, end: false },
    { to: '/client/aide', label: 'Aide', icon: <LifeBuoy size={16} />, end: false },
  ]
  const initials = profile ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}` : '?'

  return (
    <aside
      className={`w-60 shrink-0 flex flex-col h-full ${isLight ? '' : 'bg-forest-900'}`}
      style={isLight ? { background: 'color-mix(in srgb, var(--brand-primary) 6%, #FFFFFF)' } : undefined}
    >
      {/* Logo : cabinet si marque blanche, sinon Gëstu */}
      <div className={`px-5 py-4 border-b ${borderCol}`}>
        {isBranded ? (
          <Logo variant={isLight ? 'light' : 'dark'} height={24} />
        ) : isRegul ? (
          <GestuLogo size="xs" variant="dark" product="regul" />
        ) : (
          <p className={`text-lg font-extrabold ${ink}`}>G{'ë'}stu<span className="text-gold-500">.</span></p>
        )}
        <p className={`text-[9px] tracking-[2px] uppercase ${inkFaint} mt-0.5`}>{isBranded ? branding?.cabinet_name : vocab.portalLabel}</p>
      </div>

      <nav className="flex-1 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `flex items-center gap-2.5 px-5 py-2.5 text-[13px] transition-colors relative ${isActive ? activeCls : idleCls}`}
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-gold-500" />}
                <span className="w-5 text-center flex justify-center">{item.icon}</span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={`px-5 py-3 border-t ${borderCol} flex items-center gap-2.5`}>
        <div className="w-8 h-8 rounded-full bg-gold-500 text-forest-900 flex items-center justify-center text-xs font-bold shrink-0">{initials}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs ${ink} font-medium truncate`}>{profile?.first_name} {profile?.last_name}</p>
          <button onClick={signOut} className={`text-[10px] transition-colors ${isLight ? 'text-gray-500 hover:text-gray-700' : 'text-white/40 hover:text-white/70'}`}>
            D{'é'}connexion
          </button>
        </div>
      </div>
    </aside>
  )
}
