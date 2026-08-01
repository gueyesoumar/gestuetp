import { X, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { FindingsList } from '../../missions/fieldwork/findings/FindingsList'
import { CLASSIF_META, ControlClassificationCard } from './ControlClassificationCard'
import { ControlObservationsSection } from './ControlObservationsSection'
import { useControlObservations } from './useControlObservations'
import { useClientControlReview } from './useClientControlReview'
import type { ControlWithAssessment } from './useMissionControls'

interface ControlDetailDrawerProps {
  control: ControlWithAssessment
  canContribute: boolean
  canApprove: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onObservationSubmitted: () => void
  hasPrev: boolean
  hasNext: boolean
}

export function ControlDetailDrawer({
  control, canContribute, canApprove, onClose, onPrev, onNext, onObservationSubmitted, hasPrev, hasNext,
}: ControlDetailDrawerProps): JSX.Element {
  const obs = useControlObservations(control.assessmentId, onObservationSubmitted)
  const review = useClientControlReview(control.assessmentId, () => { onObservationSubmitted(); onClose() })

  const classifKey = (control.classification ?? 'conforme') as keyof typeof CLASSIF_META
  const classifMeta = CLASSIF_META[classifKey]

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/35 z-40" onClick={onClose} />

      {/* Drawer */}
      <aside className="fixed top-0 right-0 bottom-0 w-[620px] max-w-full bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
          <span className="font-mono text-[12px] font-semibold text-forest-700 bg-forest-50 px-2 py-0.5 rounded">
            {control.controlCode}
          </span>
          <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: classifMeta.bg, color: classifMeta.color }}>
            {classifMeta.label}
          </span>
          <div className="ml-auto flex gap-1">
            <button onClick={onPrev} disabled={!hasPrev} className="p-1.5 border border-gray-200 rounded-lg hover:bg-forest-50 disabled:opacity-30 disabled:cursor-not-allowed" title="Contrôle précédent">
              <ChevronLeft size={14} />
            </button>
            <button onClick={onNext} disabled={!hasNext} className="p-1.5 border border-gray-200 rounded-lg hover:bg-forest-50 disabled:opacity-30 disabled:cursor-not-allowed" title="Contrôle suivant">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <h2 className="text-[16px] font-bold text-gray-900 mb-1">{control.controlName}</h2>
          <p className="text-[11px] text-gray-400 mb-5">Domaine {control.domainCode} {'·'} {control.domainName}</p>

          {/* Exigence */}
          {control.controlDescription && (
            <div className="mb-5">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{'\u{1F4CB}'} Exigence du r{'é'}f{'é'}rentiel</div>
              <p className="text-[13px] text-gray-700 leading-relaxed px-3 py-2.5 bg-gray-50 border-l-[3px] border-gray-300 rounded">{control.controlDescription}</p>
            </div>
          )}

          {/* Classification */}
          <ControlClassificationCard meta={classifMeta} />

          {/* Constats d'audit */}
          {control.findings.length > 0 && (
            <div className="mb-5">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{'\u{1F50D}'} Constats d{'’'}audit</div>
              <FindingsList findings={control.findings} density="compact" />
            </div>
          )}

          {/* Guidance */}
          {control.controlGuidance && (
            <div className="mb-6 px-3 py-2.5 bg-forest-50 rounded-lg flex items-start gap-2">
              <span className="text-[11px] text-forest-700">{control.controlGuidance}</span>
            </div>
          )}

          {/* Section observations */}
          {control.assessmentId && (
            <ControlObservationsSection
              control={control}
              obs={obs}
              review={review}
              canContribute={canContribute}
              canApprove={canApprove}
            />
          )}

          {/* Pas d'assessment = contrôle pas encore évalué */}
          {!control.assessmentId && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-[12px] text-gray-400">
              Ce contr{'ô'}le n{'’'}a pas encore {'é'}t{'é'} {'é'}valu{'é'} par l{'’'}auditeur.
            </div>
          )}
        </div>

        {/* Footer */}
        {canContribute && control.assessmentId && !control.myObservationId && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-[12px] font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors">
              Fermer
            </button>
            <button
              onClick={obs.handleSubmit}
              disabled={!obs.newObsText.trim() || obs.submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-forest-700 text-white text-[12px] font-semibold rounded-lg hover:bg-forest-900 disabled:opacity-50 transition-colors"
            >
              <Send size={12} />
              {obs.submitting ? 'Envoi...' : 'Envoyer l’observation'}
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
