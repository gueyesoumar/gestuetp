import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { RISK_GLOSSARY } from './riskGlossaryTerms'

/** Bouton + panneau Glossaire du risque : rend accessible le vocabulaire ISO 27005. */
export function RiskGlossary(): JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
      >
        <BookOpen size={15} /> Glossaire
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Glossaire du risque">
        <dl className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {RISK_GLOSSARY.map((g) => (
            <div key={g.term} className="border-b border-gray-100 pb-3 last:border-0">
              <dt className="text-[13px] font-semibold text-gray-900">{g.term}</dt>
              <dd className="mt-0.5 text-[12.5px] text-gray-600 leading-relaxed">{g.def}</dd>
            </div>
          ))}
        </dl>
      </Modal>
    </>
  )
}
