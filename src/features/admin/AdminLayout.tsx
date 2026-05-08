import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Building2, Users, ClipboardList, Flag, Activity, BookMarked, ChevronLeft, Tag } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

const NAV: NavItem[] = [
  { to: '/admin', label: 'Tableau de bord', icon: <LayoutDashboard size={16} strokeWidth={1.5} /> },
  { to: '/admin/cabinets', label: 'Organisations', icon: <Building2 size={16} strokeWidth={1.5} /> },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: <Users size={16} strokeWidth={1.5} /> },
  { to: '/admin/frameworks', label: 'Référentiels', icon: <BookMarked size={16} strokeWidth={1.5} /> },
  { to: '/admin/plans', label: 'Plans', icon: <Tag size={16} strokeWidth={1.5} /> },
  { to: '/admin/feature-flags', label: 'Feature flags', icon: <Flag size={16} strokeWidth={1.5} /> },
  { to: '/admin/monitoring', label: 'Santé / Monitoring', icon: <Activity size={16} strokeWidth={1.5} /> },
  { to: '/admin/audit-log', label: 'Audit log', icon: <ClipboardList size={16} strokeWidth={1.5} /> },
]

export function AdminLayout() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-page-bg">
      <aside className="w-60 flex-shrink-0 flex flex-col bg-[#0F2A22] text-white">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
          <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center text-forest-900 font-black font-mono text-sm">G</div>
          <div className="leading-tight">
            <div className="font-extrabold text-sm">G<span className="text-gold-500">ë</span>stu</div>
            <div className="text-[9.5px] uppercase tracking-[1.2px] text-gold-500 font-bold">Admin</div>
          </div>
        </div>

        <nav className="flex-1 py-3 relative">
          <div className="px-4 pb-1.5 text-[10px] uppercase tracking-wider text-white/35 font-bold">Plateforme</div>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) =>
                `relative flex items-center gap-2.5 mx-2 my-0.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive ? 'bg-gold-500/15 text-white before:absolute before:-left-2 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-[18px] before:bg-gold-500 before:rounded-r' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <span className="opacity-85">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2 text-[11px] text-white/55">
          <div className="w-7 h-7 rounded-full bg-gold-500 text-forest-900 flex items-center justify-center font-extrabold text-[11px]">
            {profile ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}` : '?'}
          </div>
          <div>
            <div className="text-white font-semibold text-[11.5px]">{profile?.first_name} {profile?.last_name}</div>
            <div className="text-[10px]">Platform owner</div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="bg-gold-500 text-forest-900 px-5 py-2 flex items-center gap-3 text-[12px] font-semibold">
          <span className="px-2 py-0.5 border border-forest-900 rounded-full text-[10px] font-bold uppercase tracking-wider">Admin mode</span>
          Vous &ecirc;tes dans la console super-admin G&euml;stu &mdash; toutes vos actions sont trac&eacute;es.
          <button
            type="button"
            onClick={() => navigate('/')}
            className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-bold underline underline-offset-2 hover:no-underline"
          >
            <ChevronLeft size={12} />
            Retour &agrave; l&apos;app cabinet
          </button>
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
