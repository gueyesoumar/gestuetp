import { useState, useRef, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { ValidationDetailBody } from './ValidationDetailBody'
import { ReviewDecisionControls } from './ReviewDecisionControls'
import { useReviewDecision, type ReviewDecision } from './useReviewDecision'
import type { ReviewStage } from './reviewQueue'
import type { ReviewAssessment } from '../useReviewAssessments'

interface FocusReviewModeProps {
  items: ReviewAssessment[]
  reviewStage: ReviewStage
  onExit: () => void
}

/** Revue séquentielle plein écran des évaluations à valider, pilotée au clavier.
 *  Raccourcis : A approuver · R commenter (rejet) · →/J suivant · ←/K précédent · Esc quitter. */
export function FocusReviewMode({ items, onExit }: FocusReviewModeProps): JSX.Element | null {
  const [queue] = useState(items) // figé au lancement pour ne pas se réordonner sous les doigts
  const [index, setIndex] = useState(0)
  const { comment, setComment, reviewing, error, setError, decide, reset } = useReviewDecision()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const current = queue[index] as ReviewAssessment | undefined

  // Remet le commentaire à zéro à chaque changement d'évaluation.
  useEffect(() => { reset() }, [index, reset])

  const navNext = useCallback(() => setIndex((i) => Math.min(queue.length - 1, i + 1)), [queue.length])
  const navPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])
  const focusComment = useCallback(() => {
    setError('Commentaire requis pour rejeter.')
    textareaRef.current?.focus()
  }, [setError])

  const act = useCallback(async (decision: ReviewDecision) => {
    if (!current) return
    const ok = await decide(current.id, decision)
    if (!ok) return
    if (index >= queue.length - 1) onExit()
    else setIndex((i) => i + 1)
  }, [current, decide, index, queue.length, onExit])

  // Un seul listener : lit les derniers handlers via une ref.
  const ref = useRef({ act, navNext, navPrev, focusComment, onExit })
  ref.current = { act, navNext, navPrev, focusComment, onExit }
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const el = e.target as HTMLElement | null
      const typing = !!el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')
      if (typing) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void ref.current.act('rejected') }
        else if (e.key === 'Escape') { e.preventDefault(); el?.blur() }
        return
      }
      switch (e.key) {
        case 'Escape': e.preventDefault(); ref.current.onExit(); break
        case 'a': case 'A': e.preventDefault(); void ref.current.act('approved'); break
        case 'r': case 'R': e.preventDefault(); ref.current.focusComment(); break
        case 'ArrowRight': case 'j': case 'J': e.preventDefault(); ref.current.navNext(); break
        case 'ArrowLeft': case 'k': case 'K': e.preventDefault(); ref.current.navPrev(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!current) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-forest-700">Mode focus · {index + 1} / {queue.length}</p>
            <h3 className="text-[15px] font-bold text-gray-900 truncate">
              <span className="font-mono text-gray-500">{current.control.code}</span> {current.control.name}
            </h3>
            <p className="text-[11px] text-gray-400">{current.auditor.first_name} {current.auditor.last_name}</p>
          </div>
          <button onClick={onExit} aria-label="Quitter le mode focus" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="px-5 py-4">
          <ValidationDetailBody assessment={current} />
          <div className="mt-4">
            <ReviewDecisionControls
              comment={comment}
              setComment={setComment}
              reviewing={reviewing}
              error={error}
              onDecide={(d) => void act(d)}
              textareaRef={textareaRef}
              onCommentKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void act('rejected') } }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 hidden sm:block">
            <Kbd>A</Kbd> approuver · <Kbd>R</Kbd> commenter · <Kbd>→</Kbd>/<Kbd>←</Kbd> naviguer · <Kbd>Échap</Kbd> quitter
          </p>
          <div className="flex gap-2 ml-auto">
            <button onClick={navPrev} disabled={index === 0}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40">
              <ChevronLeft size={15} /> Précédent
            </button>
            <button onClick={navNext} disabled={index === queue.length - 1}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40">
              Suivant <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }): JSX.Element {
  return <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 font-mono text-[10px] text-gray-600">{children}</kbd>
}
