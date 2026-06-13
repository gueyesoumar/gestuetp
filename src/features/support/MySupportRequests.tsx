import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useMySupportRequests } from './useMySupportRequests'
import { SupportRequestDetail } from './SupportRequestDetail'
import { SUPPORT_NATURE_LABELS, SUPPORT_STATUS_LABELS } from '../../lib/constants'
import type { User } from '../../types/database.types'

interface Props {
  profile: User
  onBack: () => void
}

const NATURE_COLOR: Record<string, string> = {
  bug: 'bg-orange-50 text-orange-700',
  demande: 'bg-blue-50 text-blue-700',
  suggestion: 'bg-amber-50 text-amber-700',
}

/** Suivi read-only des tickets soumis par l'utilisateur courant (toutes natures). */
export function MySupportRequests({ profile, onBack }: Props): JSX.Element {
  const { requests, loading, error } = useMySupportRequests(profile.id)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = requests.find((r) => r.id === selectedId) ?? null

  if (selected) {
    return (
      <SupportRequestDetail
        request={selected}
        onBack={() => setSelectedId(null)}
        readOnly
        backLabel="Mes demandes"
      />
    )
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 mb-4 hover:text-gray-600">
        <ArrowLeft size={15} /> Centre d&apos;aide
      </button>
      <h1 className="text-lg font-bold text-gray-900 mb-1">Mes demandes</h1>
      <p className="text-sm text-gray-500 mb-4">Le suivi de vos signalements, demandes et suggestions.</p>

      {loading ? (
        <p className="text-sm text-gray-400">Chargement&hellip;</p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">Vous n&apos;avez pas encore de demande.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase text-gray-400">Nature</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase text-gray-400">Sujet</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase text-gray-400">Statut</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} onClick={() => setSelectedId(r.id)} className="border-b border-gray-50 cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${NATURE_COLOR[r.nature] ?? 'bg-gray-100 text-gray-600'}`}>
                      {SUPPORT_NATURE_LABELS[r.nature]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{r.title}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{SUPPORT_STATUS_LABELS[r.status]}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
