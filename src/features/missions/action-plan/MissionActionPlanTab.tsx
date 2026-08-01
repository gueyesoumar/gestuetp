import { useMemo, useState } from 'react'
import { Download, ListChecks, CalendarClock, Sparkles } from 'lucide-react'
import { useActionPlan } from '../closure/useActionPlan'
import { useMissionUserRole } from '../useMissionUserRole'
import { ActionPlanPreviewModal } from '../closure/ActionPlanPreviewModal'
import { CARVerificationDialog } from '../closure/CARVerificationDialog'
import { ActionPlanKPIs } from './ActionPlanKPIs'
import { ActionPlanList } from './ActionPlanList'
import { ActionPlanTimeline } from './ActionPlanTimeline'
import { ActionPlanFilters, applyFilters, type ActionPlanFilterState } from './ActionPlanFilters'
import { EmptyState } from '../../../components/ui/EmptyState'
import type { MissionDetail } from '../useMissionDetail'
import type { ActionPlanCAR } from '../../reports/generateActionPlanXLSX'

interface MissionActionPlanTabProps {
  mission: MissionDetail
}

type ViewMode = 'list' | 'timeline'

export function MissionActionPlanTab({ mission }: MissionActionPlanTabProps): JSX.Element {
  const userRole = useMissionUserRole(mission)
  const actionPlan = useActionPlan(mission)
  const [view, setView] = useState<ViewMode>('list')
  const [selected, setSelected] = useState<ActionPlanCAR | null>(null)
  const [filters, setFilters] = useState<ActionPlanFilterState>({ status: 'all', classification: 'all', search: '' })

  const filtered = useMemo(() => applyFilters(actionPlan.cars, filters), [actionPlan.cars, filters])

  if (actionPlan.loading) {
    return <p className="text-sm text-gray-400 text-center py-12">Chargement du plan d&apos;action…</p>
  }

  // État vide (aucune CAR) → CTA générer
  if (actionPlan.cars.length === 0) {
    return (
      <>
        <EmptyState
          title="Aucune action corrective"
          description="Le plan d'action sera généré automatiquement à partir des constats classés (NC majeures, mineures, observations) lors de la revue interne."
          action={userRole.isPrivileged ? (
            <button
              onClick={() => void actionPlan.openPreview()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-800"
            >
              <Sparkles size={14} /> Générer le plan d&apos;action
            </button>
          ) : undefined}
        />
        <ActionPlanPreviewModal
          open={actionPlan.previewOpen}
          busy={actionPlan.busy}
          findings={actionPlan.findings}
          onClose={actionPlan.closePreview}
          onConfirm={actionPlan.confirmGeneration}
        />
      </>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Plan d&apos;action</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Suivi des demandes d&apos;actions correctives (CAR) issues de l&apos;audit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {userRole.isPrivileged && (
            <button
              onClick={() => void actionPlan.openPreview()}
              disabled={actionPlan.busy}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-forest-700 bg-white border border-forest-300 rounded-lg hover:bg-forest-50 disabled:opacity-50"
            >
              <Sparkles size={14} /> Régénérer
            </button>
          )}
          <button
            onClick={() => void actionPlan.exportXLSX()}
            disabled={actionPlan.busy || actionPlan.cars.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-800 disabled:opacity-50"
          >
            <Download size={14} /> Exporter XLSX
          </button>
        </div>
      </div>

      {/* KPI */}
      <ActionPlanKPIs cars={actionPlan.cars} />

      {/* Filtres + switch de vue */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <ActionPlanFilters state={filters} onChange={setFilters} />
        <div className="inline-flex border border-gray-200 rounded-lg overflow-hidden">
          <ViewButton active={view === 'list'} onClick={() => setView('list')} icon={<ListChecks size={14} />} label="Liste" />
          <ViewButton active={view === 'timeline'} onClick={() => setView('timeline')} icon={<CalendarClock size={14} />} label="Échéancier" />
        </div>
      </div>

      {/* Vue principale */}
      {view === 'list'
        ? <ActionPlanList cars={filtered} onSelect={setSelected} />
        : <ActionPlanTimeline cars={filtered} onSelect={setSelected} />
      }

      {/* Modals */}
      <ActionPlanPreviewModal
        open={actionPlan.previewOpen}
        busy={actionPlan.busy}
        findings={actionPlan.findings}
        onClose={actionPlan.closePreview}
        onConfirm={actionPlan.confirmGeneration}
      />
      <CARVerificationDialog
        car={selected}
        canVerify={userRole.isPrivileged}
        userNames={actionPlan.userNames}
        contactNames={actionPlan.contactNames}
        onClose={() => setSelected(null)}
        onChanged={actionPlan.reload}
      />
    </div>
  )
}

function ViewButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: JSX.Element; label: string }): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-forest-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      {icon} {label}
    </button>
  )
}
