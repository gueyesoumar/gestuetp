import type { FormEvent } from 'react'
import type { PlatformRolePermissions } from '../../types/database.types'
import { RolePermissionFields } from './RolePermissionFields'

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

/** Formulaire de création / édition d'un rôle. */
export function RoleForm({
  name, description, permissions, isDefault, isEditing, saving, isGroupOrg,
  onNameChange, onDescriptionChange, onTogglePermission, onPermissionsChange, onIsDefaultChange,
  onSubmit, onCancel,
}: RoleFormProps): JSX.Element {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="role-name" className="block text-sm font-medium text-gray-700">Nom</label>
        <input id="role-name" type="text" required value={name} onChange={(e) => onNameChange(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100" disabled={saving} />
      </div>
      <div>
        <label htmlFor="role-description" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea id="role-description" value={description} onChange={(e) => onDescriptionChange(e.target.value)} rows={2} className="mt-1 block w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100" disabled={saving} />
      </div>

      <RolePermissionFields permissions={permissions} saving={saving} isGroupOrg={isGroupOrg} onTogglePermission={onTogglePermission} onPermissionsChange={onPermissionsChange} />

      <label className="flex cursor-pointer items-center gap-2.5">
        <input type="checkbox" checked={isDefault} onChange={(e) => onIsDefaultChange(e.target.checked)} className="rounded border-gray-300 text-forest-600 focus:ring-forest-500" disabled={saving} />
        <span className="text-[13px] text-gray-700">Rôle par défaut</span>
      </label>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-200 px-4 py-2.5 text-[13px] text-gray-600 transition-colors hover:bg-forest-50 hover:border-forest-300" disabled={saving}>Retour</button>
        <button type="submit" disabled={saving || !name.trim()} className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-forest-900 disabled:opacity-50">
          {saving ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  )
}
