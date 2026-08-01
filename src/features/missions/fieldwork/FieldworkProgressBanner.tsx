import { ArrowRight, Check } from 'lucide-react'

interface FieldworkProgressBannerProps {
  visible: boolean
  submittedCount: number
  totalReference: number
  draftCount: number
  notStartedCount: number
  completionPct: number
}

interface FieldworkLaunchReviewBannerProps {
  visible: boolean
  submittedCount: number
  totalReference: number
  draftCount: number
  notStartedCount: number
  onLaunch: () => void
}

export function FieldworkProgressBanner({
  visible,
  submittedCount,
  totalReference,
  draftCount,
  notStartedCount,
  completionPct,
}: FieldworkProgressBannerProps) {
  if (!visible) return null
  const plural = notStartedCount > 1 ? 's' : ''
  return (
    <div className="flex items-center gap-4 p-4 mb-4 bg-white border border-gray-200 rounded-xl">
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">
          Progression : {submittedCount}/{totalReference} contr&ocirc;les soumis
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {draftCount > 0 ? `${draftCount} en brouillon. ` : ''}
          {notStartedCount > 0 ? `${notStartedCount} non commencé${plural}.` : ''}
        </p>
      </div>
      <div className="w-32">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-2 bg-forest-500 rounded-full transition-all" style={{ width: `${completionPct}%` }} />
        </div>
        <p className="text-[10px] text-gray-400 text-right mt-1">{Math.round(completionPct)}%</p>
      </div>
    </div>
  )
}

export function FieldworkLaunchReviewBanner({
  visible,
  submittedCount,
  totalReference,
  draftCount,
  notStartedCount,
  onLaunch,
}: FieldworkLaunchReviewBannerProps) {
  if (!visible) return null
  const plural = notStartedCount > 1 ? 's' : ''
  const allDone = notStartedCount === 0 && draftCount === 0
  const headline = allDone
    ? `Tous les contrôles sont soumis (${submittedCount}/${totalReference}).`
    : `${submittedCount}/${totalReference} contrôles soumis.${draftCount > 0 ? ` ${draftCount} en brouillon.` : ''}${notStartedCount > 0 ? ` ${notStartedCount} non commencé${plural}.` : ''}`
  const subline = allDone
    ? 'Vous pouvez lancer la revue interne.'
    : 'Vous pouvez lancer la revue sans attendre les contrôles restants.'

  return (
    <div className="flex items-center justify-between p-4 mb-4 bg-forest-50 border border-forest-300 rounded-xl">
      <div>
        <p className="text-sm font-semibold text-forest-900">{headline}</p>
        <p className="text-xs text-forest-600 mt-0.5">{subline}</p>
      </div>
      <button onClick={onLaunch}
        className="px-5 py-2.5 bg-forest-700 text-white rounded-lg text-[13px] font-semibold hover:bg-forest-900 transition-colors shrink-0">
        <ArrowRight size={14} className="inline" /> Lancer la revue interne
      </button>
    </div>
  )
}

export function FieldworkTransitionBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="p-3 mb-4 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">
      <Check size={14} className="inline mr-1" />{message}
    </div>
  )
}
