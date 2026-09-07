import { useState } from 'react'
import { useSupportRequestList } from '../../features/support/useSupportRequestList'
import { SupportRequestDetail } from '../../features/support/SupportRequestDetail'
import { SupportFulfillmentPanel } from '../../features/support/SupportFulfillmentPanel'
import { SupportTriagePanel } from '../../features/support/SupportTriagePanel'
import { SupportFeasibilityPanel } from '../../features/support/SupportFeasibilityPanel'
import { SUPPORT_NATURE_LABELS, SUPPORT_STATUS_LABELS } from '../../lib/constants'
import type { SupportStatus } from '../../types/database.types'

const NATURE_COLOR: Record<string, string> = {
  bug: 'bg-orange-50 text-orange-700',
  demande: 'bg-blue-50 text-blue-700',
  suggestion: 'bg-amber-50 text-amber-700',
}

export function AdminSupportPage(): JSX.Element {
  const { requests, loading, error, updateStatus } = useSupportRequestList()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = requests.find((r) => r.id === selectedId) ?? null

  const onStatus = (status: SupportStatus): void => {
    if (selected) void updateStatus(selected.id, status)
  }

  if (loading) return <p className="p-6 text-sm text-gray-400">Chargement&hellip;</p>
  if (error) return <p className="p-6 text-sm text-red-500">{error}</p>

  if (selected) {
    return (
      <div className="max-w-3xl p-6">
        <SupportRequestDetail
          request={selected}
          onBack={() => setSelectedId(null)}
          onStatus={onStatus}
          fulfillment={
            selected.nature === 'bug' ? <SupportTriagePanel request={selected} />
            : selected.nature === 'suggestion' ? <SupportFeasibilityPanel request={selected} />
            : <SupportFulfillmentPanel request={selected} onResolved={() => onStatus('resolved')} />
          }
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Support</h1>
      <p className="text-sm text-gray-500 mb-5">File unifi&eacute;e des bugs, demandes et suggestions.</p>

      {requests.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">Aucune demande pour le moment.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase text-gray-400">Nature</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase text-gray-400">Sujet</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase text-gray-400">Origine</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase text-gray-400">Statut</th>
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
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.role_at_submit ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{SUPPORT_STATUS_LABELS[r.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
