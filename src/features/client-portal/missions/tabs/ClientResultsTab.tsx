import { useState } from 'react'
import { BarChart3, List, ArrowRight } from 'lucide-react'
import { useMissionControls } from '../useMissionControls'
import { ControlSyntheseView } from '../ControlSyntheseView'
import { ControlListView } from '../ControlListView'
import { ControlDetailDrawer } from '../ControlDetailDrawer'
import { useClientActionItems } from './useClientActionItems'
import type { ClientMissionDetail } from '../useClientMissionDetail'
import type { ControlWithAssessment } from '../useMissionControls'

interface Props {
  mission: ClientMissionDetail
  canContribute: boolean
  canApprove: boolean
  onRefetch: () => void
  onTabChange?: (tab: string) => void
}

type ViewMode = 'synthese' | 'liste'

export function ClientResultsTab({ mission, canContribute, canApprove, onTabChange }: Props): JSX.Element {
  const [view, setView] = useState<ViewMode>('synthese')
  const [selectedControl, setSelectedControl] = useState<ControlWithAssessment | null>(null)

  const data = useMissionControls(mission.id)
  const { items, loading: aLoading } = useClientActionItems(mission.id)

  // Compute prev/next based on the currently filtered list (only evaluated controls)
  const evaluated = data.controls.filter((c) => c.assessmentId !== null)
  const currentIndex = selectedControl ? evaluated.findIndex((c) => c.controlId === selectedControl.controlId) : -1

  const handlePrev = (): void => {
    if (currentIndex > 0) setSelectedControl(evaluated[currentIndex - 1])
  }
  const handleNext = (): void => {
    if (currentIndex >= 0 && currentIndex < evaluated.length - 1) setSelectedControl(evaluated[currentIndex + 1])
  }

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-forest-300 border-t-forest-700 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* View switcher */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setView('synthese')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold transition-colors ${
              view === 'synthese' ? 'bg-white text-forest-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 size={13} />
            Synth{'è'}se
          </button>
          <button
            onClick={() => setView('liste')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold transition-colors ${
              view === 'liste' ? 'bg-white text-forest-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List size={13} />
            Liste compl{'è'}te
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'synthese' ? (
        <ControlSyntheseView
          globalScore={data.globalScore}
          totalControls={data.totalControls}
          conformesCount={data.conformesCount}
          observationsCount={data.observationsCount}
          minorNcCount={data.minorNcCount}
          majorNcCount={data.majorNcCount}
          strengthsCount={data.strengthsCount}
          myObservationsCount={data.myObservationsCount}
          domainSummaries={data.domainSummaries}
          onSwitchToList={() => setView('liste')}
        />
      ) : (
        <ControlListView
          controls={data.controls}
          domainSummaries={data.domainSummaries}
          conformesCount={data.conformesCount}
          observationsCount={data.observationsCount}
          minorNcCount={data.minorNcCount}
          majorNcCount={data.majorNcCount}
          strengthsCount={data.strengthsCount}
          myObservationsCount={data.myObservationsCount}
          onControlClick={setSelectedControl}
        />
      )}

      {/* Plan d'action : résumé compact. Le détail actionnable (réponses, export) est dans l'onglet dédié. */}
      <section>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold">Plan d{'’'}action</h3>
            {aLoading ? (
              <p className="text-xs text-gray-400 mt-0.5">Chargement...</p>
            ) : items.length > 0 ? (
              <p className="text-xs text-gray-500 mt-0.5">
                {items.filter((i) => i.status !== 'done').length} action(s) à traiter sur {items.length}.
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">Les recommandations seront disponibles après la validation des constats.</p>
            )}
          </div>
          {items.length > 0 && onTabChange && (
            <button type="button" onClick={() => onTabChange('action_plan')}
              className="inline-flex items-center gap-1.5 bg-forest-700 text-white px-4 py-2 rounded-lg text-[13px] font-semibold hover:bg-forest-900 transition-colors shrink-0">
              Ouvrir le plan d{'’'}action <ArrowRight size={14} />
            </button>
          )}
        </div>
      </section>

      {/* Drawer */}
      {selectedControl && (
        <ControlDetailDrawer
          control={selectedControl}
          canContribute={canContribute}
          canApprove={canApprove}
          onClose={() => setSelectedControl(null)}
          onPrev={handlePrev}
          onNext={handleNext}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex >= 0 && currentIndex < evaluated.length - 1}
          onObservationSubmitted={data.refetch}
        />
      )}
    </div>
  )
}
