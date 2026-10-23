import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, AlertTriangle } from 'lucide-react'
import { useSubsidiaries } from '../group-module/useSubsidiaries'
import { useActionTracking, isActionOverdue, actionLabel, type TrackedAction } from './useActionTracking'
import { ActionTrackingRow } from './ActionTrackingRow'
import { ActionDetailDrawer } from './ActionDetailDrawer'
import { ManualActionModal } from './ManualActionModal'
import { MeasureFormModal } from './MeasureFormModal'
import { FilterBar } from '../../components/filters/FilterBar'
import { useFilters, type FilterDef } from '../../components/filters/useFilters'
import { Pagination, pageSlice } from '../../components/ui/Pagination'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ACTION_CLASSIFICATION_OPTIONS } from '../../lib/constants'

const PAGE_SIZE = 12
const STATUS_OPTIONS = [
  { value: 'open', label: 'Ouverte' },
  { value: 'client_responded', label: 'À vérifier' },
  { value: 'verified', label: 'Vérifiée' },
  { value: 'closed', label: 'Clôturée' },
]

export function RegulActionTrackingVolet(): JSX.Element {
  const navigate = useNavigate()
  const { subsidiaries } = useSubsidiaries()
  const { actions, loading, refetch } = useActionTracking(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [escalate, setEscalate] = useState<TrackedAction | null>(null)
  const [detail, setDetail] = useState<TrackedAction | null>(null)

  const defs: FilterDef[] = useMemo(() => [
    { key: 'entity', label: 'Assujetti', type: 'select', options: subsidiaries.map((s) => ({ value: s.id, label: s.name })) },
    { key: 'classification', label: 'Gravité', type: 'select', options: ACTION_CLASSIFICATION_OPTIONS.map((o) => ({ value: o.value, label: o.label })) },
    { key: 'status', label: 'Statut', type: 'select', options: STATUS_OPTIONS },
    { key: 'source', label: 'Origine', type: 'select', options: [{ value: 'mission', label: 'Mission' }, { value: 'manual', label: 'Manuel' }] },
    { key: 'overdue', label: 'En retard', type: 'toggle' },
  ], [subsidiaries])
  const filters = useFilters(defs)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return actions.filter((a) => {
      if (filters.values.entity && a.entity_id !== filters.values.entity) return false
      if (filters.values.classification && a.finding_classification !== filters.values.classification) return false
      if (filters.values.status && a.status !== filters.values.status) return false
      if (filters.values.source && a.source !== filters.values.source) return false
      if (filters.values.overdue === true && !isActionOverdue(a)) return false
      if (q && !`${a.code} ${a.control_code ?? ''} ${a.control_name ?? ''} ${a.description} ${a.entity_name}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [actions, filters.values, search])

  const pageRows = pageSlice(filtered, page, PAGE_SIZE)
  const overdueTotal = useMemo(() => actions.filter(isActionOverdue).length, [actions])
  const defaultEntity = typeof filters.values.entity === 'string' ? filters.values.entity : undefined

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[13px] text-gray-500">
          {actions.length} action(s) corrective(s) (missions de contrôle + saisies manuelles)
          {overdueTotal > 0 && <span className="ml-2 inline-flex items-center gap-1 text-amber-700"><AlertTriangle size={13} /> {overdueTotal} en retard</span>}
        </p>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900">
          <Plus size={16} /> Nouvelle action
        </button>
      </div>

      <FilterBar defs={defs} state={filters} search={{ value: search, onChange: (v) => { setSearch(v); setPage(1) }, placeholder: 'Code, contrôle, assujetti...' }} />

      {actions.length === 0 ? (
        <EmptyState title="Aucune action corrective" description="Les actions de mission apparaissent après clôture, ou créez une action manuelle avec le bouton ci-dessus." />
      ) : filtered.length === 0 ? (
        <EmptyState title="Aucun résultat" description="Aucune action ne correspond aux filtres actifs." />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {pageRows.map((a) => (
            <ActionTrackingRow key={a.id} action={a} onOpenDetail={setDetail} onOpenMission={(id) => navigate(`/controles/${id}`)} onEscalate={setEscalate} onChanged={refetch} />
          ))}
          <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      )}

      {showCreate && (
        <ManualActionModal
          subsidiaries={subsidiaries}
          defaultEntityId={defaultEntity}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); refetch() }}
        />
      )}

      {detail && (
        <ActionDetailDrawer
          action={detail}
          onEscalate={(x) => { setDetail(null); setEscalate(x) }}
          onOpenMission={(id) => navigate(`/controles/${id}`)}
          onChanged={() => { refetch(); setDetail(null) }}
          onClose={() => setDetail(null)}
        />
      )}

      {escalate && (
        <MeasureFormModal
          fromAction={{ entityId: escalate.entity_id, actionId: escalate.id, code: escalate.code, description: actionLabel(escalate) }}
          onClose={() => setEscalate(null)}
          onSaved={() => { setEscalate(null); refetch() }}
        />
      )}
    </div>
  )
}
