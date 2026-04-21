import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Shield, UserX, UserCheck, Send, Eye, KeyRound } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { PermissionBadges } from './PermissionBadges'
import type { MemberWithRoles } from './types'

interface MemberRowProps {
  member: MemberWithRoles
  onAssignRole: (member: MemberWithRoles) => void
  onToggleStatus: (member: MemberWithRoles) => void
  onResendInvite: (member: MemberWithRoles) => void
  onViewProfile: (member: MemberWithRoles) => void
  onResetPassword: (member: MemberWithRoles) => void
}

export function MemberRow({
  member,
  onAssignRole,
  onToggleStatus,
  onResendInvite,
  onViewProfile,
  onResetPassword,
}: MemberRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showPerms, setShowPerms] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
      <td className="px-4 py-3">
        <button
          onClick={() => onViewProfile(member)}
          className="text-left hover:underline"
        >
          <p className="text-sm font-medium text-gray-900">
            {member.first_name} {member.last_name}
          </p>
          {member.job_title && (
            <p className="text-xs text-gray-500">{member.job_title}</p>
          )}
        </button>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{member.email}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {member.roles.length > 0
            ? member.roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setShowPerms((v) => !v)}
                  className="cursor-pointer"
                  title="Voir les permissions"
                >
                  <Badge label={role.name} variant="blue" />
                </button>
              ))
            : <span className="text-xs text-gray-400">Aucun r&ocirc;le</span>
          }
        </div>
        {showPerms && member.roles.length > 0 && (
          <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
            {member.roles.map((role) => (
              <div key={role.id} className="mb-1 last:mb-0">
                <p className="text-[11px] font-medium text-gray-500 mb-1">{role.name}</p>
                <PermissionBadges permissions={role.permissions} compact />
              </div>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge
          label={member.is_active ? 'Actif' : 'Inactif'}
          variant={member.is_active ? 'green' : 'gray'}
        />
      </td>
      <td className="px-4 py-3">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Actions"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 w-52 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
              <MenuButton
                icon={<Eye size={14} />}
                label="Voir le profil"
                onClick={() => { onViewProfile(member); setMenuOpen(false) }}
              />
              <MenuButton
                icon={<Shield size={14} />}
                label="G&eacute;rer les r&ocirc;les"
                onClick={() => { onAssignRole(member); setMenuOpen(false) }}
              />
              <MenuButton
                icon={<Send size={14} />}
                label="Renvoyer l&rsquo;invitation"
                onClick={() => { onResendInvite(member); setMenuOpen(false) }}
              />
              <MenuButton
                icon={<KeyRound size={14} />}
                label="Modifier le mot de passe"
                onClick={() => { onResetPassword(member); setMenuOpen(false) }}
              />
              <hr className="my-1 border-gray-100" />
              <MenuButton
                icon={member.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                label={member.is_active ? 'D\u00e9sactiver' : 'R\u00e9activer'}
                onClick={() => { onToggleStatus(member); setMenuOpen(false) }}
                danger={member.is_active}
              />
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

function MenuButton({
  icon, label, onClick, danger = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
