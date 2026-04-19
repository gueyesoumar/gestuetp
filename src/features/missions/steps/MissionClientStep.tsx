import { useState } from 'react'
import { Badge } from '../../../components/ui/Badge'
import type { CabinetClient } from '../../../types/database.types'

interface MissionClientStepProps {
  clients: CabinetClient[]
  selectedClientId: string
  onSelect: (id: string) => void
  onNewClient: () => void
}

export function MissionClientStep({ clients, selectedClientId, onSelect, onNewClient }: MissionClientStepProps) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? clients.filter((c) => c.client_name.toLowerCase().includes(search.toLowerCase()))
    : clients

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900">Pour quel client ?</h3>
      <p className="mt-1 text-[13px] text-gray-500">Sélectionnez un client de votre portefeuille</p>

      <div className="mt-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client..."
          className="w-full max-w-xs"
        />
      </div>

      <div className="mt-3 space-y-2 max-h-[340px] overflow-y-auto">
        {filtered.map((client) => {
          const selected = client.id === selectedClientId
          const initials = client.client_name.substring(0, 2).toUpperCase()

          return (
            <button
              key={client.id}
              onClick={() => onSelect(client.id)}
              className={`flex w-full items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all ${
                selected
                  ? 'border-forest-700 bg-forest-50'
                  : 'border-gray-200 hover:border-forest-300'
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-forest-100 text-[12px] font-bold text-forest-700 flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-gray-900">{client.client_name}</div>
                <div className="text-[11px] text-gray-300 mt-0.5">
                  {[client.client_sector, client.client_city, client.effectifs].filter(Boolean).join(' · ')}
                </div>
                {(client.exigences_reglementaires.length > 0 || client.parties_interessees.length > 0) && (
                  <div className="flex gap-1.5 mt-1">
                    {client.exigences_reglementaires.length > 0 && (
                      <Badge label={`${client.exigences_reglementaires.length} exigences`} variant="forest" />
                    )}
                    {client.parties_interessees.length > 0 && (
                      <Badge label={`${client.parties_interessees.length} PI`} variant="gold" />
                    )}
                  </div>
                )}
              </div>
              <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                selected ? 'border-forest-700 bg-forest-700 text-white text-[10px]' : 'border-gray-300'
              }`}>
                {selected && '✓'}
              </div>
            </button>
          )
        })}

        <button
          onClick={onNewClient}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-forest-300 p-3 text-[13px] text-forest-700 hover:bg-forest-50 transition-colors"
        >
          + Enregistrer un nouveau client
        </button>
      </div>
    </div>
  )
}
