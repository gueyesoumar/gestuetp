import { useState } from 'react'
import type { SubsidiaryRow } from '../../group-module/useSubsidiaries'

interface MissionSubsidiaryStepProps {
  subsidiaries: SubsidiaryRow[]
  loading: boolean
  selectedSubsidiaryId: string
  onSelect: (id: string) => void
}

export function MissionSubsidiaryStep({ subsidiaries, loading, selectedSubsidiaryId, onSelect }: MissionSubsidiaryStepProps) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? subsidiaries.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : subsidiaries

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900">Quelle filiale superviser ?</h3>
      <p className="mt-1 text-[13px] text-gray-500">Sélectionnez une filiale de votre groupe</p>

      <div className="mt-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une filiale..."
          className="w-full max-w-xs"
        />
      </div>

      {loading ? (
        <p className="mt-4 text-[13px] text-gray-400">Chargement des filiales...</p>
      ) : subsidiaries.length === 0 ? (
        <p className="mt-4 text-[13px] text-amber-600">Aucune filiale recensée — créez-en une dans le module Groupe.</p>
      ) : (
        <div className="mt-3 space-y-2 max-h-[340px] overflow-y-auto">
          {filtered.map((sub) => {
            const selected = sub.id === selectedSubsidiaryId
            const initials = sub.name.substring(0, 2).toUpperCase()

            return (
              <button
                key={sub.id}
                onClick={() => onSelect(sub.id)}
                className={`flex w-full items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all ${
                  selected ? 'border-forest-700 bg-forest-50' : 'border-gray-200 hover:border-forest-300'
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-forest-100 text-[12px] font-bold text-forest-700 flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-gray-900">{sub.name}</div>
                  <div className="text-[11px] text-gray-300 mt-0.5">
                    {[sub.sector, sub.city].filter(Boolean).join(' · ') || 'Filiale'}
                  </div>
                </div>
                <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                  selected ? 'border-forest-700 bg-forest-700 text-white text-[10px]' : 'border-gray-300'
                }`}>
                  {selected && '✓'}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
