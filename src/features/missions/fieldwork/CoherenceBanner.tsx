import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { getConformityShort } from './findings/conformityRules'
import { useInterControlCtx } from './interControl'
import type { ConformityLevel } from '../mission-constants'
import type { CoherenceIssue } from './interControl'

interface CoherenceBannerProps {
  issues: CoherenceIssue[]
  onAlign: (level: ConformityLevel) => void
  readOnly?: boolean
}

/**
 * Alerte NON bloquante : des contrôles équivalents (crosswalk) reçoivent des niveaux de
 * conformité divergents. Propose d'aligner sur le niveau du contrôle lié, ou d'ignorer.
 */
export function CoherenceBanner({ issues, onAlign, readOnly }: CoherenceBannerProps): JSX.Element | null {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || issues.length === 0) return null
  const first = issues[0]

  return (
    <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
      <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 text-xs text-amber-900 leading-relaxed">
        <strong>Cohérence inter-contrôles</strong>
        <ul className="mt-1 space-y-0.5">
          {issues.map((i) => (
            <li key={i.code}>
              <span className="font-mono font-semibold">{i.code}</span> (équivalent) est noté{' '}
              <span className="font-semibold">{getConformityShort(i.otherLevel as ConformityLevel)}</span>, divergent de ce contrôle.
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {!readOnly && (
            <button
              type="button"
              onClick={() => onAlign(first.otherLevel as ConformityLevel)}
              className="text-[11px] font-semibold text-white bg-amber-700 hover:bg-amber-800 px-2.5 py-1 rounded-md"
            >
              Aligner sur {getConformityShort(first.otherLevel as ConformityLevel)}
            </button>
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-[11px] font-medium text-amber-800 hover:text-amber-900 px-2 py-1"
          >
            Ignorer
          </button>
        </div>
      </div>
    </div>
  )
}

/** Variante branchée sur le contexte inter-contrôles (à rendre sous InterControlProvider). */
export function CoherenceBannerConnected({ controlId, conformityLevel, onAlign, readOnly }: {
  controlId: string
  conformityLevel: string | null
  onAlign: (level: ConformityLevel) => void
  readOnly?: boolean
}): JSX.Element | null {
  const ctx = useInterControlCtx()
  if (!ctx) return null
  return <CoherenceBanner issues={ctx.coherenceIssues(controlId, conformityLevel)} onAlign={onAlign} readOnly={readOnly} />
}
