import { useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Trash2, Plus, Shield } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { PermissionBadges } from './PermissionBadges'
import { usePlatformRoles } from './usePlatformRoles'
import { useRoleCrud } from './useRoleCrud'
import { useAuth } from '../../hooks/useAuth'
import { useOrganizationHierarchy } from '../../hooks/useOrganizationHierarchy'
import { DASHBOARD_VIEW_LABELS, DASHBOARD_VIEW_DESCRIPTIONS } from '../../lib/constants'
import type { PlatformRole, PlatformRolePermissions, DashboardView } from '../../types/database.types'

interface RoleManagementModalProps {
  open: boolean
  onClose: () => void
}

const EMPTY_PERMISSIONS: PlatformRolePermissions = {
  can_create_mission: false,
  can_assign_team: false,
  can_be_lead: false,
  can_designate_lead: false,
}

type ViewMode = 'list' | 'form'

export function RoleManagementModal({ open, onClose }: RoleManagementModalProps) {
  const { profile } = useAuth()
  const { isGroup } = useOrganizationHierarchy(profile?.organization_id)
  const { roles, loading, refetch } = usePlatformRoles()
  const { createRole, updateRole, deleteRole, saving, deleting, error } = useRoleCrud(refetch)

  const [view, setView] = useState<ViewMode>('list')
  const [editingRole, setEditingRole] = useState<PlatformRole | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<PlatformRolePermissions>(EMPTY_PERMISSIONS)
  const [isDefault, setIsDefault] = useState(false)

  const resetForm = (): void => {
    setName('')
    setDescription('')
    setPermissions(EMPTY_PERMISSIONS)
    setIsDefault(false)
    setEditingRole(null)
    setView('list')
  }

  const startCreate = (): void => {
    resetForm()
    setView('form')
  }

  const startEdit = (role: PlatformRole): void => {
    setEditingRole(role)
    setName(role.name)
    setDescription(role.description ?? '')
    setPermissions(role.permissions)
    setIsDefault(role.is_default)
    setView('form')
  }

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    const success = editingRole
      ? await updateRole({ id: editingRole.id, name, description: description || null, permissions, is_default: isDefault })
      : await createRole({ name, description: description || null, permissions, is_default: isDefault })

    if (success) resetForm()
  }

  const handleDelete = async (roleId: string): Promise<void> => {
    const success = await deleteRole(roleId)
    if (success) resetForm()
  }

  const togglePermission = (key: keyof PlatformRolePermissions): void => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleClose = (): void => {
    resetForm()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Gestion des r&ocirc;les">
      {error && <ErrorAlert message={error} />}

      {view === 'list' ? (
        <div className="space-y-4">
          <button
            onClick={startCreate}
            className="flex items-center gap-2 rounded-lg border border-dashed border-forest-300 px-4 py-2.5 text-[13px] text-forest-700 hover:bg-forest-50 transition-colors w-full justify-center"
          >
            <Plus size={14} />
            Cr&eacute;er un r&ocirc;le
          </button>

          {loading ? (
            <p className="text-sm text-gray-400 text-center py-4">Chargement&hellip;</p>
          ) : roles.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucun r&ocirc;le d&eacute;fini.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-forest-600" />
                      <span className="text-sm font-medium text-gray-900">{role.name}</span>
                      {role.is_default && (
                        <span className="rounded-full bg-gold-200 px-2 py-0.5 text-[10px] font-medium text-gold-600">
                          Par d&eacute;faut
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(role)}
                        className="rounded p-1 text-gray-400 hover:text-forest-700 hover:bg-forest-50"
                        title="Modifier"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(role.id)}
                        disabled={deleting}
                        className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {role.description && (
                    <p className="mt-1 text-xs text-gray-500">{role.description}</p>
                  )}
                  <div className="mt-2">
                    <PermissionBadges permissions={role.permissions} compact />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <RoleForm
          name={name}
          description={description}
          permissions={permissions}
          isDefault={isDefault}
          isEditing={!!editingRole}
          saving={saving}
          isGroupOrg={isGroup}
          onNameChange={setName}
          onDescriptionChange={setDescription}
          onTogglePermission={togglePermission}
          onPermissionsChange={setPermissions}
          onIsDefaultChange={setIsDefault}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      )}
    </Modal>
  )
}

/* ── Sous-composant formulaire ── */

interface RoleFormProps {
  name: string
  description: string
  permissions: PlatformRolePermissions
  isDefault: boolean
  isEditing: boolean
  saving: boolean
  isGroupOrg: boolean
  onNameChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onTogglePermission: (key: keyof PlatformRolePermissions) => void
  onPermissionsChange: (p: PlatformRolePermissions) => void
  onIsDefaultChange: (v: boolean) => void
  onSubmit: (e: FormEvent) => void
  onCancel: () => void
}

const PERMISSION_KEYS: { key: keyof PlatformRolePermissions; label: string }[] = [
  { key: 'can_create_mission', label: 'Créer des missions' },
  { key: 'can_assign_team', label: 'Assigner des équipes' },
  { key: 'can_be_lead', label: 'Être chef de mission' },
  { key: 'can_designate_lead', label: 'Désigner un chef de mission' },
  { key: 'can_delete_mission', label: 'Supprimer des missions' },
  { key: 'can_manage_members', label: 'Gérer les membres (inviter, suspendre)' },
  { key: 'can_manage_clients', label: 'Gérer les clients du cabinet' },
  { key: 'can_edit_organization', label: 'Modifier les paramètres du cabinet' },
  { key: 'can_manage_roles', label: 'Gérer les rôles et leurs permissions' },
]

const GROUP_PERMISSION_KEYS: { key: keyof PlatformRolePermissions; label: string; description: string }[] = [
  { key: 'can_view_supervision', label: 'Voir la supervision consolid\u00e9e', description: 'Acc\u00e8s \u00e0 la page Supervision et aux scores des entit\u00e9s' },
  { key: 'can_create_campaign', label: 'Cr\u00e9er des campagnes d\u2019audit', description: 'Lancer des campagnes d\u2019audit sur plusieurs entit\u00e9s' },
  { key: 'can_manage_subsidiaries', label: 'G\u00e9rer les entit\u00e9s supervis\u00e9es', description: 'Ajouter ou retirer des entit\u00e9s du groupe' },
  { key: 'can_view_entity_detail', label: 'Voir le d\u00e9tail des entit\u00e9s', description: 'Naviguer vers les missions et scores de chaque entit\u00e9' },
]

function RoleForm({
  name, description, permissions, isDefault, isEditing, saving, isGroupOrg,
  onNameChange, onDescriptionChange, onTogglePermission, onPermissionsChange, onIsDefaultChange,
  onSubmit, onCancel,
}: RoleFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="role-name" className="block text-sm font-medium text-gray-700">Nom</label>
        <input
          id="role-name"
          type="text"
          required
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
          disabled={saving}
        />
      </div>

      <div>
        <label htmlFor="role-description" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          id="role-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 resize-none"
          disabled={saving}
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">Permissions</legend>
        <div className="space-y-2">
          {PERMISSION_KEYS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={permissions[key] === true}
                onChange={() => onTogglePermission(key)}
                className="rounded border-gray-300 text-forest-600 focus:ring-forest-500"
                disabled={saving}
              />
              <span className="text-[13px] text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">Vues du tableau de bord</legend>
        <div className="space-y-2">
          {(Object.keys(DASHBOARD_VIEW_LABELS) as DashboardView[]).map((view) => {
            const checked = permissions.dashboard_views?.includes(view) ?? false
            return (
              <label key={view} className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const current = permissions.dashboard_views ?? []
                    const next = checked ? current.filter((v) => v !== view) : [...current, view]
                    const def = permissions.default_dashboard_view
                    const newDefault = next.length > 0 && (!def || !next.includes(def)) ? next[0] : def
                    onPermissionsChange({ ...permissions, dashboard_views: next, default_dashboard_view: newDefault })
                  }}
                  className="rounded border-gray-300 text-forest-600 focus:ring-forest-500 mt-0.5"
                  disabled={saving}
                />
                <div>
                  <span className="text-[13px] text-gray-700 font-medium">{DASHBOARD_VIEW_LABELS[view]}</span>
                  <span className="block text-[11px] text-gray-400">{DASHBOARD_VIEW_DESCRIPTIONS[view]}</span>
                </div>
              </label>
            )
          })}
        </div>
        {(permissions.dashboard_views?.length ?? 0) > 1 && (
          <div className="mt-3">
            <label className="block text-[12px] font-medium text-gray-500 mb-1">Vue par d&eacute;faut</label>
            <select
              value={permissions.default_dashboard_view ?? ''}
              onChange={(e) => onPermissionsChange({ ...permissions, default_dashboard_view: e.target.value as DashboardView })}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] outline-none focus:border-forest-500"
              disabled={saving}
            >
              {(permissions.dashboard_views ?? []).map((v) => (
                <option key={v} value={v}>{DASHBOARD_VIEW_LABELS[v]}</option>
              ))}
            </select>
          </div>
        )}
      </fieldset>

      {isGroupOrg && (
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">Permissions groupe</legend>
          <div className="space-y-2">
            {GROUP_PERMISSION_KEYS.map(({ key, label, description: desc }) => {
              const checked = permissions[key] === true
              return (
                <label key={key} className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onTogglePermission(key)}
                    className="rounded border-gray-300 text-forest-600 focus:ring-forest-500 mt-0.5"
                    disabled={saving}
                  />
                  <div>
                    <span className="text-[13px] text-gray-700 font-medium">{label}</span>
                    <span className="block text-[11px] text-gray-400">{desc}</span>
                  </div>
                </label>
              )
            })}
          </div>
        </fieldset>
      )}

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => onIsDefaultChange(e.target.checked)}
          className="rounded border-gray-300 text-forest-600 focus:ring-forest-500"
          disabled={saving}
        />
        <span className="text-[13px] text-gray-700">R&ocirc;le par d&eacute;faut</span>
      </label>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2.5 text-[13px] text-gray-600 hover:bg-forest-50 hover:border-forest-300 transition-colors"
          disabled={saving}
        >
          Retour
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-forest-900 disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Cr\u00e9er'}
        </button>
      </div>
    </form>
  )
}
