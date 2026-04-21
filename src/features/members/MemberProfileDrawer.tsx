import { useState } from 'react'
import { X, Mail, Briefcase, Calendar, History, Shield } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { PermissionBadges } from './PermissionBadges'
import { MemberAuditLogPanel } from './MemberAuditLogPanel'
import { MemberMissionsPanel } from './MemberMissionsPanel'
import type { MemberWithRoles } from './types'

interface MemberProfileDrawerProps {
  member: MemberWithRoles
  open: boolean
  onClose: () => void
}

type Tab = 'info' | 'missions' | 'history'

export function MemberProfileDrawer({ member, open, onClose }: MemberProfileDrawerProps) {
  const [tab, setTab] = useState<Tab>('info')

  if (!open) return null

  const tabs: { key: Tab; label: string; icon: typeof Shield }[] = [
    { key: 'info', label: 'Profil', icon: Shield },
    { key: 'missions', label: 'Missions', icon: Briefcase },
    { key: 'history', label: 'Historique', icon: History },
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {member.first_name} {member.last_name}
            </h2>
            {member.job_title && (
              <p className="text-sm text-gray-500">{member.job_title}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-forest-600 text-forest-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === 'info' && <InfoTab member={member} />}
          {tab === 'missions' && <MemberMissionsPanel userId={member.id} />}
          {tab === 'history' && <MemberAuditLogPanel userId={member.id} />}
        </div>
      </div>
    </div>
  )
}

/* ── Onglet Info ── */

function InfoTab({ member }: { member: MemberWithRoles }) {
  return (
    <div className="space-y-6">
      {/* Coordonn&eacute;es */}
      <section>
        <h3 className="text-xs font-semibold uppercase text-gray-400 mb-3">Coordonn&eacute;es</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Mail size={14} className="text-gray-400" />
            {member.email}
          </div>
          {member.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-gray-400 text-xs">T&eacute;l.</span>
              {member.phone}
            </div>
          )}
        </div>
      </section>

      {/* Statut */}
      <section>
        <h3 className="text-xs font-semibold uppercase text-gray-400 mb-3">Statut</h3>
        <Badge
          label={member.is_active ? 'Actif' : 'Inactif'}
          variant={member.is_active ? 'green' : 'gray'}
        />
        {member.last_sign_in_at && (
          <p className="text-xs text-gray-400 mt-2">
            Derni&egrave;re connexion&nbsp;: {new Date(member.last_sign_in_at).toLocaleDateString('fr-FR', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          <Calendar size={12} className="inline mr-1" />
          Membre depuis le {new Date(member.created_at).toLocaleDateString('fr-FR', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </p>
      </section>

      {/* R&ocirc;les & Permissions */}
      <section>
        <h3 className="text-xs font-semibold uppercase text-gray-400 mb-3">
          R&ocirc;les &amp; Permissions
        </h3>
        {member.roles.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun r&ocirc;le attribu&eacute;.</p>
        ) : (
          <div className="space-y-3">
            {member.roles.map((role) => (
              <div key={role.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={14} className="text-forest-600" />
                  <span className="text-sm font-medium text-gray-900">{role.name}</span>
                </div>
                {role.description && (
                  <p className="text-xs text-gray-500 mb-2">{role.description}</p>
                )}
                <PermissionBadges permissions={role.permissions} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
