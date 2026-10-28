import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import type { OrgSector } from './useOrgSectors'

interface SectorRowProps {
  row: OrgSector
  ro: boolean
  onRename: (id: string, label: string) => void
  onToggle: (id: string, active: boolean) => void
}

export function SectorRow({ row, ro, onRename, onToggle }: SectorRowProps): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(row.label)
  const save = (): void => {
    onRename(row.id, val)
    setEditing(false)
  }
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-gray-100 last:border-0">
      {editing ? (
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save() }}
          autoFocus
          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700"
        />
      ) : (
        <span className={`flex-1 text-sm ${row.is_active ? 'text-gray-800' : 'text-gray-400'}`}>
          {row.label}
          {!row.is_active && (
            <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Archivé</span>
          )}
        </span>
      )}
      {!ro && (
        <div className="flex items-center gap-3 shrink-0">
          {editing ? (
            <>
              <button type="button" onClick={save} className="text-forest-700 hover:text-forest-900" aria-label="Enregistrer"><Check size={16} /></button>
              <button type="button" onClick={() => { setVal(row.label); setEditing(false) }} className="text-gray-400 hover:text-gray-600" aria-label="Annuler"><X size={16} /></button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setEditing(true)} className="text-gray-400 hover:text-forest-700" aria-label="Renommer"><Pencil size={15} /></button>
              <button type="button" onClick={() => onToggle(row.id, !row.is_active)} className="text-[12px] font-medium text-gray-500 hover:text-forest-700">
                {row.is_active ? 'Désactiver' : 'Activer'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
