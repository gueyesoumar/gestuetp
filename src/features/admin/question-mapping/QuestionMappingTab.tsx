import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useQuestionMapping, type AiSuggestion } from './useQuestionMapping'
import { MappingKpis } from './MappingKpis'
import { MappingEditor } from './MappingEditor'
import { MappingCoverage } from './MappingCoverage'
import { useToast } from '../../../hooks/useToast'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'

/** Onglet « Cadrage » de la page référentiel : édite le mapping question↔contrôle
 *  (avec poids, assisté IA) et affiche la couverture. */
export function QuestionMappingTab({ frameworkId }: { frameworkId: string }) {
  const m = useQuestionMapping(frameworkId)
  const toast = useToast()
  const [view, setView] = useState<'editor' | 'coverage'>('editor')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!selectedId && m.questions.length > 0) setSelectedId(m.questions[0].id)
  }, [m.questions, selectedId])

  const generate = async (): Promise<void> => {
    setGenerating(true)
    const res = await m.generateSuggestions()
    setGenerating(false)
    if (res.error) { toast.error(res.error); return }
    setSuggestions(res.suggestions)
    toast.success(res.suggestions.length > 0 ? `${res.suggestions.length} suggestions de liens` : 'Aucune nouvelle suggestion', { description: 'Validez-les une à une dans l’éditeur.' })
    if (res.suggestions.length > 0) setView('editor')
  }

  const accept = async (s: AiSuggestion): Promise<void> => {
    const ok = await m.setLink(s.question_id, s.control_id, s.weight)
    if (ok) setSuggestions((prev) => prev.filter((x) => !(x.question_id === s.question_id && x.control_id === s.control_id)))
    else toast.error('Impossible d’ajouter ce lien')
  }

  const setWeight = (q: string, c: string, w: number): void => { void m.setLink(q, c, w) }
  const remove = (q: string, c: string): void => { void m.removeLink(q, c) }

  if (m.loading) return <LoadingSpinner />
  if (m.error) return <ErrorAlert message={m.error} />
  if (m.questions.length === 0) {
    return <p className="text-[13px] text-gray-500 p-4">Aucun questionnaire de cadrage actif n’est rattaché à ce référentiel.</p>
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 flex-wrap px-4 py-3 border-b border-gray-200 bg-[#FAFAF8]">
        <p className="text-[13px] font-semibold text-gray-800">Mapping cadrage ↔ contrôles</p>
        <span className="text-[12px] text-gray-400">{m.questions.length} questions · {m.controls.length} contrôles</span>
        <button type="button" onClick={() => void generate()} disabled={generating}
          className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-lg bg-gold-50 border border-gold-300 text-gold-600 hover:bg-gold-100 disabled:opacity-50">
          <Sparkles size={14} /> {generating ? 'Génération…' : 'Générer le mapping (IA)'}
        </button>
      </div>

      <MappingKpis coverage={m.coverage} />

      <div className="flex gap-1 px-4 pt-2.5 border-b border-gray-200">
        {([['editor', 'Par question'], ['coverage', 'Couverture des contrôles']] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setView(k)}
            className={`text-[12.5px] font-semibold px-3.5 py-2 border-b-2 ${view === k ? 'text-gray-900 border-gold-500' : 'text-gray-500 border-transparent hover:text-forest-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {view === 'editor' ? (
        <MappingEditor
          questions={m.questions}
          controls={m.controls}
          links={m.links}
          suggestions={suggestions}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onSetWeight={setWeight}
          onRemove={remove}
          onSetExpected={(q, v) => { void m.setExpected(q, v) }}
          onSetScopeExclude={(q, v) => { void m.setScopeExclude(q, v) }}
          onAccept={accept}
        />
      ) : (
        <MappingCoverage rows={m.coverage.rows} />
      )}
    </div>
  )
}
