import { Check, X } from 'lucide-react'
import { PERMISSION_LABELS } from '../../lib/constants'
import type { PlatformRolePermissions } from '../../types/database.types'

interface PermissionBadgesProps {
  permissions: PlatformRolePermissions
  compact?: boolean
}

export function PermissionBadges({ permissions, compact = false }: PermissionBadgesProps) {
  const entries = Object.entries(PERMISSION_LABELS) as [keyof PlatformRolePermissions, string][]

  if (compact) {
    const granted = entries.filter(([key]) => permissions[key])
    if (granted.length === 0) {
      return <span className="text-xs text-gray-400">Aucune permission</span>
    }
    return (
      <div className="flex flex-wrap gap-1">
        {granted.map(([key, label]) => (
          <span
            key={key}
            className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2 py-0.5 text-[11px] text-forest-700"
          >
            <Check size={10} />
            {label}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {entries.map(([key, label]) => (
        <div key={key} className="flex items-center gap-2">
          {permissions[key] ? (
            <Check size={14} className="text-emerald-600" />
          ) : (
            <X size={14} className="text-gray-300" />
          )}
          <span className={`text-xs ${permissions[key] ? 'text-gray-700' : 'text-gray-400'}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
