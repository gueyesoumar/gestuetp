import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { GestuLogo } from '../GestuLogo'
import { LayoutGrid, ShieldCheck } from 'lucide-react'
import {
  DashboardIcon, ClientsIcon, FrameworksIcon, MissionsIcon,
  OrganizationIcon, MembersIcon, LogoutIcon, BellIcon,
  CollapseIcon, ExpandIcon, ChevronUpIcon,
} from '../icons/NavIcons'
import { useAuth } from '../../hooks/useAuth'
import { useGroupPermissions } from '../../hooks/useGroupPermissions'
import { useNotifications } from '../../features/notifications/useNotifications'
import type { User } from '../../types/database.types'
import type { ReactNode } from 'react'

interface SidebarProps {
  profile: User | null
  open: boolean
  onClose: () => void
}

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  permissionKey?: 'supervision'
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Tableau de bord', icon: <DashboardIcon /> },
  { to: '/supervision', label: 'Supervision', icon: <ShieldCheck size={20} strokeWidth={1.5} />, permissionKey: 'supervision' },
  { to: '/clients', label: 'Clients', icon: <ClientsIcon /> },
  { to: '/referentiels', label: 'R\u00e9f\u00e9rentiels', icon: <FrameworksIcon /> },
  { to: '/missions', label: 'Missions', icon: <MissionsIcon /> },
]

const profileMenuItems: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/notifications', label: 'Notifications', icon: <BellIcon /> },
  { to: '/organisation', label: 'Organisation', icon: <OrganizationIcon /> },
  { to: '/membres', label: 'Membres', icon: <MembersIcon /> },
]

export function Sidebar({ profile, open, onClose }: SidebarProps) {
  const { signOut } = useAuth()
  const { canViewSupervision } = useGroupPermissions()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const initials = profile
    ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`
    : ''

  useEffect(() => {
    if (!profileMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileMenuOpen])

  const handleProfileNav = (to: string) => {
    setProfileMenuOpen(false)
    onClose()
    navigate(to)
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-forest-900 transition-all duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'w-[68px]' : 'w-60'}`}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-white/10 ${collapsed ? 'justify-center py-4' : 'px-5 py-4'}`}>
          {collapsed ? (
            <img src="/src/assets/logo-shield.svg" alt="G&euml;stu" width={24} height={28} />
          ) : (
            <div className="flex flex-1 items-center justify-between">
              <GestuLogo size="xs" variant="dark" product="comply" />
              <button onClick={() => setCollapsed(true)} className="hidden text-white/30 hover:text-white/60 transition-colors lg:block">
                <CollapseIcon />
              </button>
            </div>
          )}
        </div>

        {collapsed && (
          <button onClick={() => setCollapsed(false)} className="hidden mx-auto mt-3 text-white/30 hover:text-white/60 transition-colors lg:block">
            <ExpandIcon />
          </button>
        )}

        {/* Back to Hub */}
        <div className={`border-b border-white/10 py-2 ${collapsed ? 'px-2' : 'px-3'}`}>
          <NavLink
            to="/hub"
            onClick={onClose}
            title={collapsed ? 'Hub ETP' : undefined}
            className={collapsed
              ? 'flex items-center justify-center w-11 h-11 mx-auto rounded-xl text-white/30 hover:bg-white/8 hover:text-white/60 transition-colors'
              : 'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[12px] font-medium text-white/30 hover:bg-white/8 hover:text-white/60 transition-colors'
            }
          >
            <LayoutGrid size={16} />
            {!collapsed && <span>Hub ETP</span>}
          </NavLink>
        </div>

        {/* Navigation principale */}
        <nav className={`flex-1 py-3 ${collapsed ? 'px-2' : 'px-3'}`}>
          {NAV_ITEMS.filter((item) => {
            if (item.permissionKey === 'supervision' && !canViewSupervision) return false
            return true
          }).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                collapsed
                  ? `relative flex items-center justify-center w-11 h-11 mx-auto mb-1 rounded-xl transition-colors ${
                      isActive ? 'bg-white/12 text-white' : 'text-white/40 hover:bg-white/8 hover:text-white/70'
                    }`
                  : `relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 mb-0.5 text-[13px] font-medium transition-colors ${
                      isActive ? 'bg-white/12 text-white' : 'text-white/45 hover:bg-white/8 hover:text-white/80'
                    }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className={`absolute top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gold-500 ${collapsed ? '-left-2' : 'left-0'}`} />}
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Profile area with popup menu */}
        {profile && (
          <div ref={menuRef} className="relative border-t border-white/10">
            {profileMenuOpen && (
              <div className={`absolute bottom-full mb-1 rounded-xl bg-forest-700 border border-white/10 shadow-xl overflow-hidden ${collapsed ? 'left-1 w-48' : 'left-2 right-2'}`}>
                {profileMenuItems.map((item) => (
                  <button
                    key={item.to}
                    onClick={() => handleProfileNav(item.to)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.to === '/notifications' && unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                ))}
                <div className="border-t border-white/10" />
                <button
                  onClick={() => { setProfileMenuOpen(false); signOut() }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-red-300 hover:bg-white/10 hover:text-red-200 transition-colors"
                >
                  <span className="flex-shrink-0"><LogoutIcon /></span>
                  <span>D&eacute;connexion</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className={`w-full py-3 transition-colors hover:bg-white/5 ${collapsed ? 'flex justify-center px-2' : 'flex items-center gap-3 px-4'}`}
            >
              <div className="relative">
                <div className={`flex items-center justify-center rounded-full bg-forest-500 text-white font-semibold ${collapsed ? 'h-8 w-8 text-[10px]' : 'h-9 w-9 text-xs'}`}>
                  {initials}
                </div>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && (
                <>
                  <div className="min-w-0 text-left flex-1">
                    <p className="truncate text-[13px] font-medium text-white">
                      {profile.first_name} {profile.last_name}
                    </p>
                    <p className="truncate text-[11px] text-white/35">{profile.email}</p>
                  </div>
                  <span className={`text-white/30 transition-transform ${profileMenuOpen ? '' : 'rotate-180'}`}>
                    <ChevronUpIcon />
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
