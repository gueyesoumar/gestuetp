import { ClipboardCheck, ArrowRight } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useReviewAssessments } from '../useReviewAssessments'
import { resolveReviewStage, isActionable } from '../review/reviewQueue'
import type { MissionDetail } from '../useMissionDetail'

interface ValidationsDigestCardProps {
  mission: MissionDetail
  onOpen: () => void
}

/** Carte cockpit : raccourci vers les évaluations qui attendent la décision de l'utilisateur. */
export function ValidationsDigestCard({ mission, onOpen }: ValidationsDigestCardProps): JSX.Element | null {
  const { profile } = useAuth()
  const stage = resolveReviewStage(profile?.id, mission.lead_auditor_user?.id, mission.associate_user?.id)
  const { assessments, loading } = useReviewAssessments(stage ? mission.id : undefined)

  if (!stage || loading) return null
  const count = assessments.filter((a) => isActionable(a, stage)).length
  if (count === 0) return null

  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 text-left hover:border-forest-300 hover:bg-forest-50/40 transition-colors"
    >
      <span className="shrink-0 h-10 w-10 rounded-full bg-forest-50 text-forest-700 flex items-center justify-center">
        <ClipboardCheck size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-gray-900">Validations</p>
        <p className="text-[12.5px] text-gray-500">
          {count} évaluation{count > 1 ? 's' : ''} attend{count > 1 ? 'ent' : ''} ta décision.
        </p>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold text-forest-700">
        Ouvrir <ArrowRight size={15} />
      </span>
    </button>
  )
}
