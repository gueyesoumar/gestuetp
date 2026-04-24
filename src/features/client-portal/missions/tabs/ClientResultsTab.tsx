import { useState } from 'react'
import { BarChart3, List } from 'lucide-react'
import { useMissionControls } from '../useMissionControls'
import { ControlSyntheseView } from '../ControlSyntheseView'
import { ControlListView } from '../ControlListView'
import { ControlDetailDrawer } from '../ControlDetailDrawer'
import { ClientCARSection } from './ClientCARSection'
import { useClientActionItems } from './useClientActionItems'
import { Check } from 'lucide-react'
import { ACTION_PRIORITY_LABELS, ACTION_STATUS_LABELS } from '../../client-constants'
import type { ClientMissionDetail } from '../useClientMissionDetail'
import type { ActionStatus } from '../../../../types/database.types'
import type { ControlWithAssessment } from '../useMissionControls'

interface Props {
  mission: ClientMissionDetail
  isContributor: boolean
  onRefetch: () => void
}

type ViewMode = 'synthese' | 'liste'

export function ClientResultsTab({ mission, isContributor }: Props): JSX.Element {
  const [view, setView] = useState<ViewMode>('synthese')
  const [selectedControl, setSelectedControl] = useState<ControlWithAssessment | null>(null)

  const data = useMissionControls(mission.id)
  const { items, loading: aLoading, updateStatus, updating } = useClientActionItems(mission.id)

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

      {/* CAR Section */}
      <section>
        <h3 className="text-sm font-bold mb-3">Demandes d{'’'}actions correctives (CAR)</h3>
        <ClientCARSection missionId={mission.id} isContributor={isContributor} />
      </section>

      {/* Action items */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-bold">Plan d{'’'}action</h3>
          {items.length > 0 && (
            <span className="text-[10px] font-medium text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full">
              {items.filter((i) => i.status !== 'done').length} en cours
            </span>
          )}
        </div>

        {aLoading ? (
          <p className="text-xs text-gray-400 text-center py-4">Chargement...</p>
        ) : items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => {
              const prioConfig = ACTION_PRIORITY_LABELS[item.priority]
              const statusConfig = ACTION_STATUS_LABELS[item.status]
              const borderColor = item.priority === 'critical' ? 'border-l-red-500' : item.priority === 'high' ? 'border-l-orange-500' : item.priority === 'medium' ? 'border-l-gold-500' : 'border-l-gray-300'
              return (
                <div key={item.id} className={`border border-gray-200 rounded-lg bg-white border-l-[3px] ${borderColor} ${item.status === 'done' ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    {isContributor && item.status !== 'done' ? (
                      <button onClick={() => updateStatus(item.id, item.status === 'open' ? 'in_progress' : 'done' as ActionStatus)} disabled={updating}
                        className="w-5 h-5 border-2 border-gray-300 rounded flex items-center justify-center shrink-0 hover:border-green-500 transition-colors cursor-pointer">
                        {item.status === 'in_progress' && <span className="text-[10px] text-blue-500">{'●'}</span>}
                      </button>
                    ) : (
                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${item.status === 'done' ? 'bg-green-500 border-2 border-green-500' : 'border-2 border-gray-300'}`}>
                        {item.status === 'done' && <Check size={10} className="text-white" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${item.status === 'done' ? 'line-through text-gray-400' : ''}`}>{item.title}</p>
                      <div className="flex gap-2 mt-1 items-center">
                        {item.controlCode && <span className="font-mono text-[8px] font-semibold bg-forest-50 text-forest-700 px-1.5 py-0.5 rounded">{item.controlCode}</span>}
                        {prioConfig && <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${prioConfig.color}`}>{prioConfig.label}</span>}
                        {item.dueDate && <span className="text-[9px] text-gray-300">{'É'}ch. {new Date(item.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                      </div>
                    </div>
                    {statusConfig && <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${statusConfig.color}`}>{statusConfig.label}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-xs text-gray-400">Les recommandations seront disponibles apr{'è'}s la validation des constats.</p>
          </div>
        )}
      </section>

      {/* Drawer */}
      {selectedControl && (
        <ControlDetailDrawer
          control={selectedControl}
          isContributor={isContributor}
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
