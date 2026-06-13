import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useClientMissions } from './useClientMissions'
import { SuggestionForm } from '../support/SuggestionForm'
import type { User } from '../../types/database.types'

interface Props {
  profile: User
  onBack: () => void
}

/**
 * Cote client, le cabinet_id d'un ticket vient de la mission concernee
 * (l'org du client n'est pas un cabinet). On resout donc la mission avant
 * de deleguer a SuggestionForm.
 */
export function ClientSuggestionFlow({ profile, onBack }: Props): JSX.Element {
  const { missions, loading } = useClientMissions()
  const [missionId, setMissionId] = useState<string>('')

  if (loading) return <p className="p-2 text-sm text-gray-400">Chargement&hellip;</p>

  if (missions.length === 0) {
    return (
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 mb-4 hover:text-gray-600">
          <ArrowLeft size={15} /> Centre d&apos;aide
        </button>
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <p className="text-xs text-gray-400">
            Aucune mission active&nbsp;: la suggestion sera disponible d&egrave;s qu&apos;une mission vous sera ouverte.
          </p>
        </div>
      </div>
    )
  }

  const selected = missions.find((m) => m.id === missionId) ?? missions[0]

  return (
    <div>
      {missions.length > 1 && (
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-700 block mb-1.5">Mission concern&eacute;e</label>
          <select
            value={selected.id}
            onChange={(e) => setMissionId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
          >
            {missions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      )}
      <SuggestionForm profile={profile} cabinetId={selected.cabinet_id} missionId={selected.id} onBack={onBack} />
    </div>
  )
}
