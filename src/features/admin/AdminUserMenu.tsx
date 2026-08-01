import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCircle, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import type { User } from '../../types/database.types'

/** Pied de sidebar admin : avatar cliquable -> menu (compte, deconnexion). */
export function AdminUserMenu({ profile }: { profile: User | null }): JSX.Element {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const initials = profile ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}` : '?'

  return (
    <div className="relative px-3 py-3 border-t border-white/10">
      {open && (
        <>
          <button className="fixed inset-0 z-10 cursor-default" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute z-20 bottom-[64px] left-3 right-3 bg-white text-gray-700 rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
            <button onClick={() => { setOpen(false); navigate('/compte') }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium hover:bg-forest-50">
              <UserCircle size={16} className="text-forest-700" /> Mon compte
            </button>
            <div className="h-px bg-gray-100" />
            <button onClick={() => void signOut()} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50">
              <LogOut size={16} /> D&eacute;connexion
            </button>
          </div>
        </>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${open ? 'bg-white/10 ring-1 ring-gold-500/40' : 'hover:bg-white/5'}`}
      >
        <div className="w-7 h-7 rounded-full bg-gold-500 text-forest-900 flex items-center justify-center font-extrabold text-[11px]">{initials}</div>
        <div className="text-left leading-tight">
          <div className="text-white font-semibold text-[11.5px]">{profile?.first_name} {profile?.last_name}</div>
          <div className="text-[10px] text-white/55">Platform owner</div>
        </div>
        <span className="ml-auto text-white/50 text-xs">{open ? '▴' : '▾'}</span>
      </button>
    </div>
  )
}
