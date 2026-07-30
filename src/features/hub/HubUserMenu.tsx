import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, ShieldCheck } from 'lucide-react'
import type { User } from '../../types/database.types'

// Menu utilisateur du header (avatar à droite). Regroupe l'identité, l'accès
// super-admin (owner uniquement) et la déconnexion — remplace l'ancienne
// HubUserBar du bas de page et le bouton super-admin.

interface HubUserMenuProps {
  profile: User
  onSignOut: () => void
  showAdmin: boolean
}

export function HubUserMenu({ profile, onSignOut, showAdmin }: HubUserMenuProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const initials = `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`
  const roleName = profile.role === 'auditor' ? 'Auditeur' : 'Client'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu utilisateur"
        className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-white/5"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D4A843]/[0.14] text-[13px] font-bold text-[#E2C26B] ring-1 ring-[#D4A843]/35">
          {initials}
        </span>
        <ChevronDown size={14} className={`text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[220px] rounded-2xl border border-white/15 bg-[#0d2a1e] p-1.5 shadow-2xl">
          <div className="px-3 py-2.5">
            <p className="text-[13px] font-semibold text-white">{profile.first_name} {profile.last_name}</p>
            <p className="text-[11px] text-white/40">{roleName}</p>
          </div>
          <div className="my-1 h-px bg-white/10" />
          {showAdmin && (
            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/admin') }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold text-[#E2C26B] hover:bg-white/5"
            >
              <ShieldCheck size={15} strokeWidth={1.8} />
              Console super-admin
            </button>
          )}
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold text-white/70 hover:bg-white/5 hover:text-white"
          >
            <LogOut size={15} strokeWidth={1.8} />
            D&eacute;connexion
          </button>
        </div>
      )}
    </div>
  )
}
