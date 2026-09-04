import { useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Trash2, Plus, Shield } from 'lucide-react'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { PermissionBadges } from './PermissionBadges'
import { usePlatformRoles } from './usePlatformRoles'
import { useRoleCrud } from './useRoleCrud'
import { useAuth } from '../../hooks/useAuth'
import { useOrganizationHierarchy } from '../../hooks/useOrganizationHierarchy'
import { RoleForm } from './RoleForm'
import type { PlatformRole, PlatformRolePermissions } from '../../types/database.types'

const EMPTY_PERMISSIONS: PlatformRolePermissions = {
  can_create_mission: false,
  can_assign_team: false,
  can_be_lead: false,
  can_designate_lead: false,
}

type ViewMode = 'list' | 'form'

/**
 * Onglet « Rôles & permissions » du hub Organisation (ex-RoleManagementModal,
 * sorti de la modale). Liste des rôles + création / édition inline.
 */
export function RolesTab(): JSX.Element {
  const { profile } = useAuth()
  const { isGroup } = useOrganizationHierarchy(profile?.organization_id)
  const { roles, loading, refetch } = usePlatformRoles()
  const { createRole, updateRole, deleteRole, saving, deleting, error } = useRoleCrud(refetch)

  const [view, setView] = useState<ViewMode>('list')
  const [editingRole, setEditingRole] = useState<PlatformRole | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<PlatformRolePermissions>(EMPTY_PERMISSIONS)
  const [isDefault, setIsDefault] = useState(false)

  const resetForm = (): void => {
    setName(''); setDescription(''); setPermissions(EMPTY_PERMISSIONS); setIsDefault(false)
    setEditingRole(null); setView('list')
  }
  const startCreate = (): void => { resetForm(); setView('form') }
  const startEdit = (role: PlatformRole): void => {
    setEditingRole(role); setName(role.name); setDescription(role.description ?? '')
    setPermissions(role.permissions); setIsDefault(role.is_default); setView('form')
  }
  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    const ok = editingRole
      ? await updateRole({ id: editingRole.id, name, description: description || null, permissions, is_default: isDefault })
      : await createRole({ name, description: description || null, permissions, is_default: isDefault })
    if (ok) resetForm()
  }
  const handleDelete = async (roleId: string): Promise<void> => {
    const ok = await deleteRole(roleId)
    if (ok) resetForm()
  }
  const togglePermission = (key: keyof PlatformRolePermissions): void => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="max-w-2xl space-y-4">
      {error && <ErrorAlert message={error} />}

      {view === 'list' ? (
        <>
          <button onClick={startCreate} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-forest-300 px-4 py-2.5 text-[13px] text-forest-700 transition-colors hover:bg-forest-50">
            <Plus size={14} /> Créer un rôle
          </button>

          {loading ? (
            <p className="py-4 text-center text-sm text-gray-400">Chargement&hellip;</p>
          ) : roles.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">Aucun rôle défini.</p>
          ) : (
            <div className="space-y-2">
              {roles.map((role) => (
                <div key={role.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-forest-600" />
                      <span className="text-sm font-medium text-gray-900">{role.name}</span>
                      {role.is_default && (
                        <span className="rounded-full bg-gold-200 px-2 py-0.5 text-[10px] font-medium text-gold-600">Par défaut</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(role)} className="rounded p-1 text-gray-400 hover:bg-forest-50 hover:text-forest-700" title="Modifier"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(role.id)} disabled={deleting} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50" title="Supprimer"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {role.description && <p className="mt-1 text-xs text-gray-500">{role.description}</p>}
                  <div className="mt-2"><PermissionBadges permissions={role.permissions} compact /></div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <RoleForm
          name={name} description={description} permissions={permissions} isDefault={isDefault}
          isEditing={!!editingRole} saving={saving} isGroupOrg={isGroup}
          onNameChange={setName} onDescriptionChange={setDescription} onTogglePermission={togglePermission}
          onPermissionsChange={setPermissions} onIsDefaultChange={setIsDefault}
          onSubmit={handleSubmit} onCancel={resetForm}
        />
      )}
    </div>
  )
}
