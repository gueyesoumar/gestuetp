import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useClientActionPlan } from './useClientActionPlan'
import { ClientCARDialog } from './ClientCARDialog'
import { ActionPlanList } from '../../../missions/action-plan/ActionPlanList'
import { ActionPlanFilters, applyFilters, type ActionPlanFilterState } from '../../../missions/action-plan/ActionPlanFilters'
import { isOverdue } from '../../../missions/action-plan/ActionPlanKPIs'
import { EmptyState } from '../../../../components/ui/EmptyState'
import type { ClientMissionDetail } from '../useClientMissionDetail'
import type { ActionPlanCAR } from '../../../reports/generateActionPlanXLSX'

interface ClientActionPlanTabProps {
  mission: ClientMissionDetail
  canContribute: boolean
}

export function ClientActionPlanTab({ mission, canContribute }: ClientActionPlanTabProps): JSX.Element {
  const ap = useClientActionPlan(mission)
  const [selected, setSelected] = useState<ActionPlanCAR | null>(null)
  const [filters, setFilters] = useState<ActionPlanFilterState>({ status: 'all', classification: 'all', search: '' })

  const filtered = useMemo(() => applyFilters(ap.cars, filters), [ap.cars, filters])

  if (ap.loading) {
    return <p className="text-sm text-gray-400 text-center py-12">Chargement du plan d&apos;action…</p>
  }

  if (ap.cars.length === 0) {
    return (
      <EmptyState
        title="Aucune action corrective"
        description="L'auditeur n'a pas encore généré d'actions correctives pour cette mission."
      />
    )
  }

  // KPI client
  const total = ap.cars.length
  const toRespond = ap.cars.filter((c) => c.status === 'open' && !c.client_action).length
  const inValidation = ap.cars.filter((c) => c.status === 'client_responded').length
  const validated = ap.cars.filter((c) => c.verification_status === 'accepted').length
  const overdue = ap.cars.filter(isOverdue).length

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Plan d&apos;action</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Suivez et répondez aux actions correctives demandées par l&apos;auditeur.
          </p>
        </div>
        <button
          onClick={() => void ap.exportXLSX()}
          disabled={ap.busy || ap.cars.length === 0}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-800 disabled:opacity-50"
        >
          <Download size={14} /> Exporter XLSX
        </button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <KPI label="Total" value={total} color="text-gray-900" bg="bg-white border-gray-200" />
        <KPI label="À répondre" value={toRespond} color="text-amber-700" bg="bg-amber-50 border-amber-200" />
        <KPI label="En validation" value={inValidation} color="text-blue-700" bg="bg-blue-50 border-blue-200" />
        <KPI label="Validées" value={validated} color="text-green-700" bg="bg-green-50 border-green-200" />
        <KPI label="En retard" value={overdue} color="text-red-700" bg="bg-red-50 border-red-300" />
      </div>

      <ActionPlanFilters state={filters} onChange={setFilters} />

      <ActionPlanList cars={filtered} onSelect={setSelected} />

      <ClientCARDialog
        car={selected}
        canContribute={canContribute}
        contacts={ap.contacts}
        userNames={ap.userNames}
        contactNames={ap.contactNames}
        busy={ap.busy}
        onClose={() => setSelected(null)}
        onSubmit={ap.submitResponse}
      />
    </div>
  )
}

function KPI({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }): JSX.Element {
  return (
    <div className={`rounded-xl border p-4 text-center ${bg}`}>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] font-medium text-gray-500 mt-1">{label}</p>
    </div>
  )
}
