import { useState } from 'react'
import { useClientMissions } from './useClientMissions'
import { BugRecapForm } from '../support/recorder/BugRecapForm'
import type { User } from '../../types/database.types'

interface Props {
  profile: User
  onDone: () => void
}

/** Cote client, on resout le cabinet via la mission avant de creer le ticket bug. */
export function ClientBugFlow({ profile, onDone }: Props): JSX.Element {
  const { missions, loading } = useClientMissions()
  const [missionId, setMissionId] = useState<string>('')

  if (loading) return <p className="p-2 text-sm text-gray-400">Chargement&hellip;</p>
  if (missions.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <p className="text-xs text-gray-400">Aucune mission active&nbsp;: le signalement sera disponible d&egrave;s qu&apos;une mission vous sera ouverte.</p>
      </div>
    )
  }

  const selected = missions.find((m) => m.id === missionId) ?? missions[0]

  return (
    <div>
      {missions.length > 1 && (
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-700 block mb-1.5">Mission concern&eacute;e</label>
          <select value={selected.id} onChange={(e) => setMissionId(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm">
            {missions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      )}
      <BugRecapForm profile={profile} cabinetId={selected.cabinet_id} missionId={selected.id} onDone={onDone} />
    </div>
  )
}
