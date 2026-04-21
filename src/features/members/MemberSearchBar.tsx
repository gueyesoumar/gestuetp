import { Search, Filter } from 'lucide-react'
import type { MemberFilterStatus } from './types'

interface MemberSearchBarProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: MemberFilterStatus
  onStatusFilterChange: (value: MemberFilterStatus) => void
  roleFilter: string
  onRoleFilterChange: (value: string) => void
  roleOptions: { id: string; name: string }[]
}

export function MemberSearchBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  roleFilter,
  onRoleFilterChange,
  roleOptions,
}: MemberSearchBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par nom ou email&hellip;"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
        />
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-1.5">
        <Filter size={14} className="text-gray-400" />
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as MemberFilterStatus)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="inactive">Inactifs</option>
        </select>
      </div>

      {/* Role filter */}
      <select
        value={roleFilter}
        onChange={(e) => onRoleFilterChange(e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
      >
        <option value="">Tous les r&ocirc;les</option>
        {roleOptions.map((role) => (
          <option key={role.id} value={role.id}>{role.name}</option>
        ))}
      </select>
    </div>
  )
}
