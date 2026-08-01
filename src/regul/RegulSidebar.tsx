import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Building2, ClipboardCheck, AlertTriangle, Siren, BookMarked, LogOut, UserCircle } from 'lucide-react'
import { GestuLogo } from '../components/GestuLogo'
import { useAuth } from '../hooks/useAuth'
import type { ReactNode } from 'react'

interface NavItem { to: string; label: string; icon: ReactNode; soon?: boolean }

// Architecture de navigation propre au produit Regul (modules M1..M8).
// Les items "soon" tracent l'IA cible sans lien mort tant que le module
// n'est pas livré (Lot 1 = Tableau de bord + Assujettis).
const NAV: NavItem[] = [
  { to: '/', label: 'Tableau de bord', icon: <LayoutDashboard size={18} strokeWidth={1.5} /> },
  { to: '/assujettis', label: 'Assujettis', icon: <Building2 size={18} strokeWidth={1.5} /> },
  { to: '/controles', label: 'Missions de contrôle', icon: <ClipboardCheck size={18} strokeWidth={1.5} /> },
  { to: '/constats', label: 'Constats & mesures', icon: <AlertTriangle size={18} strokeWidth={1.5} /> },
  { to: '/incidents', label: 'Incidents', icon: <Siren size={18} strokeWidth={1.5} /> },
  { to: '/referentiels', label: 'Référentiels', icon: <BookMarked size={18} strokeWidth={1.5} /> },
]

export function RegulSidebar(): JSX.Element {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const initials = profile ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}` : '?'

  const linkCls = (isActive: boolean): string =>
    `relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 mb-0.5 text-[13px] font-medium transition-colors ${
      isActive ? 'bg-white/12 text-white' : 'text-white/45 hover:bg-white/8 hover:text-white/80'
    }`

  return (
    <aside className="flex w-60 flex-shrink-0 flex-col bg-forest-900">
      <div className="flex items-center px-5 py-4 border-b border-white/10">
        <GestuLogo size="xs" variant="dark" product="regul" />
      </div>

      <nav className="flex-1 py-3 px-3">
        {NAV.map((item) => item.soon ? (
          <div key={item.to} title="Bientôt disponible" className="relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 mb-0.5 text-[13px] font-medium text-white/25 cursor-default select-none">
            <span className="flex-shrink-0">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            <span className="text-[9px] uppercase tracking-wide text-gold-500/70 font-bold">Bientôt</span>
          </div>
        ) : (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => linkCls(isActive)}>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gold-500" />}
                <span className="flex-shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {profile && (
        <div className="relative border-t border-white/10">
          {menuOpen && (
            <div className="absolute bottom-full mb-1 left-2 right-2 rounded-xl bg-forest-700 border border-white/10 shadow-xl overflow-hidden">
              <button onClick={() => { setMenuOpen(false); navigate('/compte') }} className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-white/70 hover:bg-white/10 hover:text-white transition-colors">
                <UserCircle size={18} strokeWidth={1.5} /> Mon compte
              </button>
              <div className="border-t border-white/10" />
              <button onClick={() => { setMenuOpen(false); void signOut() }} className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-red-300 hover:bg-white/10 hover:text-red-200 transition-colors">
                <LogOut size={18} strokeWidth={1.5} /> Déconnexion
              </button>
            </div>
          )}
          <button onClick={() => setMenuOpen((v) => !v)} className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-500 text-white text-xs font-semibold">{initials}</div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-[13px] font-medium text-white">{profile.first_name} {profile.last_name}</p>
              <p className="truncate text-[11px] text-white/35">Régulateur</p>
            </div>
          </button>
        </div>
      )}
    </aside>
  )
}
