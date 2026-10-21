import { useState } from 'react'
import { Boxes, Plus } from 'lucide-react'
import { useVendors, type VendorListItem } from './useVendors'
import { CreateVendorModal } from './CreateVendorModal'
import { VendorDetailPage } from './VendorDetailPage'
import { QualificationBadge, CriticalityBadge } from './vendorBadges'
import { dataAccessLabel } from './vendorLabels'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { EmptyState } from '../../components/ui/EmptyState'

/** Registre des tiers / fournisseurs (Gëstu Vendor, RFC 0020 Lot 1). */
export function VendorRegisterPage(): JSX.Element {
  const { rows, loading, error, busy, create } = useVendors()
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState<VendorListItem | null>(null)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />
  if (selected) return <VendorDetailPage vendor={selected} onBack={() => setSelected(null)} />

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Boxes size={20} className="text-[#475569]" /> Registre des tiers</h1>
          <p className="mt-1 text-[13px] text-gray-500">Vos fournisseurs et prestataires : criticité, accès aux données, statut de qualification.</p>
        </div>
        <button onClick={() => setModal(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900"><Plus size={16} /> Nouveau fournisseur</button>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucun fournisseur" description="Ajoutez votre premier tiers avec le bouton ci-dessus." action={<button onClick={() => setModal(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900"><Plus size={15} /> Nouveau fournisseur</button>} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Fournisseur</th>
                <th className="text-left px-4 py-3 font-semibold">Secteur</th>
                <th className="text-left px-4 py-3 font-semibold">Accès données</th>
                <th className="text-left px-4 py-3 font-semibold">Criticité</th>
                <th className="text-left px-4 py-3 font-semibold">Qualification</th>
                <th className="text-left px-4 py-3 font-semibold">Prochaine évaluation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((v) => (
                <tr key={v.relationship_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(v)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{v.name}{v.services && <span className="block text-[11px] text-gray-400 font-normal">{v.services}</span>}</td>
                  <td className="px-4 py-3 text-gray-500">{v.sector ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{dataAccessLabel(v.data_access_level)}</td>
                  <td className="px-4 py-3"><CriticalityBadge value={v.criticality} /></td>
                  <td className="px-4 py-3"><QualificationBadge status={v.qualification_status} /></td>
                  <td className="px-4 py-3 text-gray-500">{v.next_assessment_at ? new Date(v.next_assessment_at).toLocaleDateString('fr-FR') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <CreateVendorModal busy={busy} onClose={() => setModal(false)} onCreate={create} />}
    </div>
  )
}
