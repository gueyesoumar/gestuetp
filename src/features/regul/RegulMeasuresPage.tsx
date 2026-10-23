import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClipboardList, ShieldAlert } from 'lucide-react'
import { RegulActionTrackingVolet } from './RegulActionTrackingVolet'
import { RegulMeasuresVolet } from './RegulMeasuresVolet'
import { useVocab } from '../edition/useVocab'

type Volet = 'actions' | 'mesures'

/** Ecran "Suivi des actions" (Regul) : deux volets complementaires.
 *  - Actions correctives : CAR agregees cross-missions (remediation operationnelle).
 *  - Mesures : actes gradues du regulateur (regulatory_measures, enforcement).
 *  La vue parc (lien dashboard ?vue=parc) ouvre directement le volet Mesures. */
export function RegulMeasuresPage(): JSX.Element {
  const vocab = useVocab()
  const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
  const [searchParams] = useSearchParams()
  const [volet, setVolet] = useState<Volet>(searchParams.get('vue') === 'parc' ? 'mesures' : 'actions')

  const tabs: { key: Volet; label: string; icon: JSX.Element }[] = [
    { key: 'actions', label: 'Actions correctives', icon: <ClipboardList size={15} /> },
    { key: 'mesures', label: cap(vocab.measurePlural), icon: <ShieldAlert size={15} /> },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Suivi des actions</h1>
        <p className="mt-1 text-[13px] text-gray-500">
          Actions correctives issues des missions de contrôle, et {vocab.measurePlural} graduées du régulateur ancrées dans le journal probant.
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setVolet(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${
              volet === t.key ? 'border-forest-700 text-forest-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {volet === 'actions' ? <RegulActionTrackingVolet /> : <RegulMeasuresVolet />}
    </div>
  )
}
