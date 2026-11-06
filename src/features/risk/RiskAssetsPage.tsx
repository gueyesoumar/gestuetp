import { useMemo, useState } from 'react'
import { Plus, Boxes, Pencil, Trash2 } from 'lucide-react'
import { useRiskAssets, type RiskAssetRow } from './useRiskAssets'
import { AssetFormModal } from './AssetFormModal'
import { useFilters, type FilterDef } from '../../components/filters/useFilters'
import { FilterBar } from '../../components/filters/FilterBar'
import { Pagination } from '../../components/ui/Pagination'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { RISK_ASSET_CATEGORIES, RISK_ASSET_CATEGORY_LABELS, ASSET_CRITICALITY_OPTIONS, ASSET_CRITICALITY_LABELS } from '../../lib/constants'

const PAGE = 12

/** Registre des actifs (biens supports) du volet risque. */
export function RiskAssetsPage(): JSX.Element {
  const reg = useRiskAssets()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<RiskAssetRow | null>(null)
  const [toDelete, setToDelete] = useState<RiskAssetRow | null>(null)

  const defs: FilterDef[] = useMemo(() => [
    { key: 'category', label: 'Catégorie', type: 'select', options: RISK_ASSET_CATEGORIES.map((c) => ({ value: c.value, label: c.label })) },
    { key: 'criticality', label: 'Criticité', type: 'select', options: ASSET_CRITICALITY_OPTIONS.map((c) => ({ value: c.value, label: c.label })) },
  ], [])
  const filters = useFilters(defs)

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return reg.assets.filter((a) => {
      if (q && !a.name.toLowerCase().includes(q) && !(a.business_value_name ?? '').toLowerCase().includes(q)) return false
      if (filters.values.category && a.category !== filters.values.category) return false
      if (filters.values.criticality && a.criticality !== filters.values.criticality) return false
      return true
    })
  }, [reg.assets, search, filters.values])

  const pageRows = shown.slice((page - 1) * PAGE, page * PAGE)

  if (reg.loading) return <LoadingSpinner />
  if (reg.error) return <ErrorAlert message={reg.error} />

  const openNew = (): void => { setEditing(null); setModal(true) }
  const openEdit = (a: RiskAssetRow): void => { setEditing(a); setModal(true) }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Boxes size={20} className="text-[#E07A5F]" /> Registre des actifs</h1>
          <p className="mt-1 text-[13px] text-gray-500">Les biens supports de votre organisation : rattachez-les à vos scénarios de risque.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900"><Plus size={16} /> Nouvel actif</button>
      </div>

      <FilterBar defs={defs} state={filters} search={{ value: search, onChange: (v) => { setSearch(v); setPage(1) }, placeholder: 'Rechercher un actif...' }} />

      {reg.assets.length === 0 ? (
        <EmptyState title="Aucun actif" description="Ajoutez vos premiers biens supports avec le bouton ci-dessus." action={<button onClick={openNew} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900"><Plus size={15} /> Nouvel actif</button>} />
      ) : shown.length === 0 ? (
        <EmptyState title="Aucun résultat" description="Aucun actif ne correspond à votre recherche." />
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2.5 font-semibold">Actif</th>
                <th className="px-4 py-2.5 font-semibold">Catégorie</th>
                <th className="px-4 py-2.5 font-semibold">Criticité</th>
                <th className="px-4 py-2.5 font-semibold">Valeur métier</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((a) => (
                <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                  <td className="px-4 py-3 text-gray-600">{RISK_ASSET_CATEGORY_LABELS[a.category] ?? a.category}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${a.criticality === 'eleve' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-gray-100 text-gray-600'}`}>{ASSET_CRITICALITY_LABELS[a.criticality]}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{a.business_value_name ?? '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(a)} className="p-1.5 text-gray-400 hover:text-forest-700 hover:bg-gray-100 rounded" aria-label="Modifier"><Pencil size={15} /></button>
                      <button onClick={() => setToDelete(a)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded" aria-label="Supprimer"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination total={shown.length} page={page} pageSize={PAGE} onPage={setPage} />
        </div>
      )}

      {modal && <AssetFormModal asset={editing} businessValues={reg.businessValues} onClose={() => setModal(false)} onSubmit={(a) => (editing ? reg.updateAsset(editing.id, a) : reg.createAsset(a))} />}
      <ConfirmDialog open={!!toDelete} variant="danger" title="Supprimer l'actif"
        message={<>Supprimer <b>{toDelete?.name}</b> ? Les scénarios qui le référencent perdront ce rattachement.</>}
        confirmLabel="Supprimer" onConfirm={() => { if (toDelete) void reg.deleteAsset(toDelete.id); setToDelete(null) }} onClose={() => setToDelete(null)} />
    </div>
  )
}
