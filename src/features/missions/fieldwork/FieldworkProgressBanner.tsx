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
    <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-white border border-gray-200 rounded-lg text-[12px]">
      <span className="font-semibold text-gray-900">{submittedCount}/{totalReference} soumis</span>
      <span className="text-gray-400 truncate">
        {draftCount > 0 ? `· ${draftCount} brouillon` : ''}{notStartedCount > 0 ? ` · ${notStartedCount} non commencé${plural}` : ''}
      </span>
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-forest-500 rounded-full transition-all" style={{ width: `${completionPct}%` }} />
        </div>
        <span className="text-[10px] text-gray-400 font-mono">{Math.round(completionPct)}%</span>
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
    <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-forest-50 border border-forest-300 rounded-lg text-[12px]">
      <span className="font-semibold text-forest-900 truncate">{headline}</span>
      <span className="text-forest-600 truncate hidden md:inline">&middot; {subline}</span>
      <button onClick={onLaunch}
        className="ml-auto px-3 py-1.5 bg-forest-700 text-white rounded-lg text-[12px] font-semibold hover:bg-forest-900 transition-colors shrink-0 inline-flex items-center gap-1">
        <ArrowRight size={13} /> Lancer la revue
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
