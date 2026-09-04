import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCabinetPermissions } from '../hooks/useCabinetPermissions'
import { useSupportRequestList } from '../features/support/useSupportRequestList'
import { SupportRequestDetail } from '../features/support/SupportRequestDetail'
import { SUPPORT_STATUS_LABELS } from '../lib/constants'
import type { SupportStatus } from '../types/database.types'

export function CabinetSupportPage(): JSX.Element {
  const { canManageMembers, loading: permLoading } = useCabinetPermissions()
  const { requests, loading, error, updateStatus } = useSupportRequestList()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (permLoading || loading) return <p className="p-6 text-sm text-gray-400">Chargement&hellip;</p>
  if (!canManageMembers) {
    return <p className="p-6 text-sm text-gray-400">R&eacute;serv&eacute; aux gestionnaires du cabinet.</p>
  }
  if (error) return <p className="p-6 text-sm text-red-500">{error}</p>

  const demandes = requests.filter((r) => r.nature === 'demande')
  const selected = demandes.find((r) => r.id === selectedId) ?? null
  const onStatus = (status: SupportStatus): void => { if (selected) void updateStatus(selected.id, status) }

  if (selected) {
    const note = selected.subtype === 'access_member'
      ? (
        <div className="mx-4 mb-3 border border-amber-200 bg-amber-50 rounded-xl p-3 text-[12px] text-amber-800">
          Gestion d&apos;acc&egrave;s&nbsp;: &agrave; traiter dans <Link to="/membres" className="underline font-semibold">Membres</Link>, puis marquer r&eacute;solu.
        </div>
      )
      : undefined
    return (
      <div className="max-w-3xl">
        <SupportRequestDetail request={selected} onBack={() => setSelectedId(null)} onStatus={onStatus} fulfillment={note} />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Demandes de l&apos;&eacute;quipe</h1>
      <p className="text-sm text-gray-500 mb-5">Les demandes rout&eacute;es vers votre cabinet (acc&egrave;s, fonctionnalit&eacute;s&hellip;).</p>

      {demandes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">Aucune demande pour le moment.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase text-gray-400">Sujet</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase text-gray-400">Demandeur</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase text-gray-400">Statut</th>
              </tr>
            </thead>
            <tbody>
              {demandes.map((r) => (
                <tr key={r.id} onClick={() => setSelectedId(r.id)} className="border-b border-gray-50 cursor-pointer hover:bg-gray-50">
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
