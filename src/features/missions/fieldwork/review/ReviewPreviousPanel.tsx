import { useState } from 'react'
import { History } from 'lucide-react'
import { CONFORMITY_LEVELS } from '../../mission-constants'
import { useToast } from '../../../../hooks/useToast'
import type { PreviousEval } from './useReviewBaseline'
import type { NewFindingInput } from '../findings/useAssessmentFindings'

const CLASSIF_LABEL: Record<string, string> = {
  major_nc: 'NC majeure', minor_nc: 'NC mineure', observation: 'Observation', strength: 'Point fort',
}
const conformityLabel = (k: string | null): string => CONFORMITY_LEVELS.find((c) => c.key === k)?.label ?? 'Non coté'

interface Props {
  previous: PreviousEval
  assessmentId: string
  initialDelta: 'unchanged' | 'modified' | null | undefined
  hasCurrentFindings: boolean
  readOnly: boolean
  onConformityChange: (v: string) => void
  copyFindings: (drafts: NewFindingInput[]) => Promise<number>
  setDelta: (assessmentId: string, delta: 'unchanged' | 'modified') => Promise<boolean>
}

/** Panneau « Revue précédente » (n°18 Lot 3b) : rappelle l'évaluation N-1 et permet
 *  de trancher Sans changement (reprend la cotation + les constats) ou Modifié. */
export function ReviewPreviousPanel({ previous, assessmentId, initialDelta, hasCurrentFindings, readOnly, onConformityChange, copyFindings, setDelta }: Props): JSX.Element {
  const toast = useToast()
  const [delta, setLocalDelta] = useState<'unchanged' | 'modified' | null>(initialDelta ?? null)
  const [busy, setBusy] = useState(false)

  const onUnchanged = async (): Promise<void> => {
    setBusy(true)
    if (previous.conformityLevel) onConformityChange(previous.conformityLevel)
    if (!hasCurrentFindings && previous.findings.length > 0) await copyFindings(previous.findings)
    const ok = await setDelta(assessmentId, 'unchanged')
    setBusy(false)
    if (ok) { setLocalDelta('unchanged'); toast.success('Repris de la revue précédente, à confirmer') }
    else toast.error('Enregistrement impossible')
  }
  const onModified = async (): Promise<void> => {
    setBusy(true)
    const ok = await setDelta(assessmentId, 'modified')
    setBusy(false)
    if (ok) { setLocalDelta('modified'); toast.success('Contrôle marqué comme modifié') }
    else toast.error('Enregistrement impossible')
  }

  const fmt = (iso: string | null): string => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  return (
    <section className="rounded-xl border border-forest-200 bg-forest-50/40 p-4">
      <div className="mb-2 flex items-center gap-2">
        <History size={16} className="text-forest-700" />
        <h3 className="text-sm font-bold text-gray-900">Revue précédente</h3>
        <span className="text-[11px] text-gray-500">{previous.missionName}{previous.closedAt ? ` · ${fmt(previous.closedAt)}` : ''}</span>
      </div>
      <div className="text-[12.5px] text-gray-700">
        <p><span className="text-gray-500">Cotation :</span> <b>{conformityLabel(previous.conformityLevel)}</b></p>
        {previous.observations && <p className="mt-1 whitespace-pre-wrap text-gray-600">{previous.observations}</p>}
      </div>
      {previous.findings.length > 0 && (
        <ul className="mt-2 space-y-1">
          {previous.findings.map((f, i) => (
            <li key={i} className="text-[12px] text-gray-600">
              <span className="font-semibold text-gray-800">{CLASSIF_LABEL[f.classification ?? ''] ?? 'Constat'} :</span> {f.description}
            </li>
          ))}
        </ul>
      )}
      {!readOnly && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy} onClick={() => void onUnchanged()}
            className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-50 ${delta === 'unchanged' ? 'bg-forest-700 text-white' : 'border border-forest-300 text-forest-700 hover:bg-forest-50'}`}>
            Sans changement
          </button>
          <button type="button" disabled={busy} onClick={() => void onModified()}
            className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-50 ${delta === 'modified' ? 'bg-gold-500 text-forest-900' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            Modifié
          </button>
          {delta === 'unchanged' && <span className="text-[11px] text-gray-500">Cotation et constats repris, à confirmer avant soumission.</span>}
        </div>
      )}
    </section>
  )
}
