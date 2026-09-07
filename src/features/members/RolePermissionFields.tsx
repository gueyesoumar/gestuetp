import type { PlatformRolePermissions, DashboardView } from '../../types/database.types'
import { DASHBOARD_VIEW_LABELS, DASHBOARD_VIEW_DESCRIPTIONS } from '../../lib/constants'

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
  { key: 'can_view_supervision', label: 'Voir la supervision consolidée', description: 'Accès à la page Supervision et aux scores des entités' },
  { key: 'can_create_campaign', label: "Créer des campagnes d'audit", description: "Lancer des campagnes d'audit sur plusieurs entités" },
  { key: 'can_manage_subsidiaries', label: 'Gérer les entités supervisées', description: 'Ajouter ou retirer des entités du groupe' },
  { key: 'can_view_entity_detail', label: 'Voir le détail des entités', description: 'Naviguer vers les missions et scores de chaque entité' },
]

interface Props {
  permissions: PlatformRolePermissions
  saving: boolean
  isGroupOrg: boolean
  onTogglePermission: (key: keyof PlatformRolePermissions) => void
  onPermissionsChange: (p: PlatformRolePermissions) => void
}

/** Les trois groupes de cases à cocher d'un rôle : permissions, vues du tableau de bord, permissions groupe. */
export function RolePermissionFields({ permissions, saving, isGroupOrg, onTogglePermission, onPermissionsChange }: Props): JSX.Element {
  return (
    <>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-gray-700">Permissions</legend>
        <div className="space-y-2">
          {PERMISSION_KEYS.map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" checked={permissions[key] === true} onChange={() => onTogglePermission(key)} className="rounded border-gray-300 text-forest-600 focus:ring-forest-500" disabled={saving} />
              <span className="text-[13px] text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-gray-700">Vues du tableau de bord</legend>
        <div className="space-y-2">
          {(Object.keys(DASHBOARD_VIEW_LABELS) as DashboardView[]).map((v) => {
            const checked = permissions.dashboard_views?.includes(v) ?? false
            return (
              <label key={v} className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox" checked={checked}
                  onChange={() => {
                    const current = permissions.dashboard_views ?? []
                    const next = checked ? current.filter((x) => x !== v) : [...current, v]
                    const def = permissions.default_dashboard_view
                    const newDefault = next.length > 0 && (!def || !next.includes(def)) ? next[0] : def
                    onPermissionsChange({ ...permissions, dashboard_views: next, default_dashboard_view: newDefault })
                  }}
                  className="mt-0.5 rounded border-gray-300 text-forest-600 focus:ring-forest-500" disabled={saving}
                />
                <div>
                  <span className="text-[13px] font-medium text-gray-700">{DASHBOARD_VIEW_LABELS[v]}</span>
                  <span className="block text-[11px] text-gray-400">{DASHBOARD_VIEW_DESCRIPTIONS[v]}</span>
                </div>
              </label>
            )
          })}
        </div>
        {(permissions.dashboard_views?.length ?? 0) > 1 && (
          <div className="mt-3">
            <label className="mb-1 block text-[12px] font-medium text-gray-500">Vue par défaut</label>
            <select value={permissions.default_dashboard_view ?? ''} onChange={(e) => onPermissionsChange({ ...permissions, default_dashboard_view: e.target.value as DashboardView })} className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] outline-none focus:border-forest-500" disabled={saving}>
              {(permissions.dashboard_views ?? []).map((v) => (<option key={v} value={v}>{DASHBOARD_VIEW_LABELS[v]}</option>))}
            </select>
          </div>
        )}
      </fieldset>

      {isGroupOrg && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700">Permissions groupe</legend>
          <div className="space-y-2">
            {GROUP_PERMISSION_KEYS.map(({ key, label, description }) => (
              <label key={key} className="flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" checked={permissions[key] === true} onChange={() => onTogglePermission(key)} className="mt-0.5 rounded border-gray-300 text-forest-600 focus:ring-forest-500" disabled={saving} />
                <div>
                  <span className="text-[13px] font-medium text-gray-700">{label}</span>
                  <span className="block text-[11px] text-gray-400">{description}</span>
                </div>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </>
  )
}
