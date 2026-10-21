import { useMemo, useState } from 'react'
import { Boxes, Plus, Download } from 'lucide-react'
import { useVendors, type VendorListItem } from './useVendors'
import { CreateVendorModal } from './CreateVendorModal'
import { VendorDetailPage } from './VendorDetailPage'
import { VendorRegisterTable } from './VendorRegisterTable'
import { VendorExpiryAlert } from './VendorExpiryAlert'
import { dataAccessLabel, criticalityLabel, qualificationLabel } from './vendorLabels'
import { expiryState, EXPIRY_LABEL, EXPIRY_FILTER_OPTIONS } from './vendorExpiry'
import { useFilters, type FilterDef } from '../../components/filters/useFilters'
import { FilterBar } from '../../components/filters/FilterBar'
import { downloadCsv } from '../../lib/downloadCsv'
import { VENDOR_QUALIFICATION_OPTIONS, VENDOR_CRITICALITY_OPTIONS } from '../../lib/constants'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { EmptyState } from '../../components/ui/EmptyState'

const FILTER_DEFS: FilterDef[] = [
  { key: 'qualification', label: 'Qualification', type: 'select', options: [...VENDOR_QUALIFICATION_OPTIONS] },
  { key: 'criticality', label: 'Criticité', type: 'select', options: [...VENDOR_CRITICALITY_OPTIONS] },
  { key: 'expiry', label: 'Échéance', type: 'select', options: [...EXPIRY_FILTER_OPTIONS] },
]

/** Registre des tiers / fournisseurs : consultation, filtre, export, alertes d'echeance (RFC 0020 Lot 1 + 4). */
export function VendorRegisterPage(): JSX.Element {
  const { rows, loading, error, busy, create } = useVendors()
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState<VendorListItem | null>(null)
  const [search, setSearch] = useState('')
  const filters = useFilters(FILTER_DEFS)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((v) => {
      if (q && !v.name.toLowerCase().includes(q) && !(v.services ?? '').toLowerCase().includes(q)) return false
      if (filters.values.qualification && v.qualification_status !== filters.values.qualification) return false
      if (filters.values.criticality && v.criticality !== filters.values.criticality) return false
      if (filters.values.expiry && expiryState(v.next_assessment_at) !== filters.values.expiry) return false
      return true
    })
  }, [rows, search, filters.values])

  const exportCsv = (): void => {
    const header = ['Fournisseur', 'Secteur', 'Services', 'Accès données', 'Criticité', 'Qualification', 'Validité jusqu\'au', 'Prochaine évaluation', 'État échéance']
    const body = filtered.map((v) => [
      v.name, v.sector ?? '', v.services ?? '', dataAccessLabel(v.data_access_level), criticalityLabel(v.criticality),
      qualificationLabel(v.qualification_status),
      v.valid_until ? new Date(v.valid_until).toLocaleDateString('fr-FR') : '',
      v.next_assessment_at ? new Date(v.next_assessment_at).toLocaleDateString('fr-FR') : '',
      EXPIRY_LABEL[expiryState(v.next_assessment_at)],
    ])
    downloadCsv(`registre-fournisseurs-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body])
  }

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
        <div className="flex items-center gap-2">
          {rows.length > 0 && <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"><Download size={16} /> Exporter</button>}
          <button onClick={() => setModal(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900"><Plus size={16} /> Nouveau fournisseur</button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucun fournisseur" description="Ajoutez votre premier tiers avec le bouton ci-dessus." action={<button onClick={() => setModal(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900"><Plus size={15} /> Nouveau fournisseur</button>} />
      ) : (
        <>
          <VendorExpiryAlert rows={rows} />
          <FilterBar defs={FILTER_DEFS} state={filters} search={{ value: search, onChange: setSearch, placeholder: 'Rechercher un fournisseur...' }} />
          {filtered.length === 0 ? (
            <p className="text-[13px] text-gray-400 px-1">Aucun fournisseur ne correspond aux filtres.</p>
          ) : (
            <VendorRegisterTable rows={filtered} onSelect={setSelected} />
          )}
        </>
      )}

      {modal && <CreateVendorModal busy={busy} onClose={() => setModal(false)} onCreate={create} />}
    </div>
  )
}
