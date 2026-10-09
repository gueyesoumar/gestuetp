import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { MappingQuestion, MappingControl, MappingLink, AiSuggestion } from './useQuestionMapping'

interface MappingEditorProps {
  questions: MappingQuestion[]
  controls: MappingControl[]
  links: MappingLink[]
  suggestions: AiSuggestion[]
  selectedId: string | null
  onSelect: (id: string) => void
  onSetWeight: (questionId: string, controlId: string, weight: number) => void
  onRemove: (questionId: string, controlId: string) => void
  onSetExpected: (questionId: string, value: string | null) => void
  onSetScopeExclude: (questionId: string, value: string | null) => void
  onAccept: (s: AiSuggestion) => void
}

const W_LABEL: Record<number, string> = { 1: 'Ctx', 2: 'Part.', 3: 'Preuve' }

/** Champ « valeur de réponse » réutilisable (réponse attendue, règle de périmètre). */
function AnswerValueField({ label, hint, questionType, current, placeholder, onSave }: {
  label: string
  hint: string
  questionType: string
  current: string
  placeholder: string
  onSave: (v: string | null) => void
}) {
  const [text, setText] = useState(current)

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">{label}</p>
      {questionType === 'boolean' ? (
        <div className="inline-flex border border-gray-200 rounded-lg overflow-hidden bg-white">
          {([['oui', 'Oui'], ['non', 'Non'], ['', 'Non défini']] as const).map(([v, lbl]) => (
            <button key={lbl} type="button" onClick={() => onSave(v || null)}
              className={`text-[11.5px] font-semibold px-3 py-1.5 border-l first:border-l-0 border-gray-200 ${current === v ? 'bg-forest-50 text-forest-700' : 'text-gray-500 hover:bg-gray-50'}`}>
              {lbl}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder}
            className="flex-1 text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white" />
          <button type="button" onClick={() => onSave(text.trim() || null)} className="text-[11.5px] font-semibold text-forest-700 px-2 shrink-0">Définir</button>
        </div>
      )}
      <p className="text-[10px] text-gray-400 mt-1.5">{hint}</p>
    </div>
  )
}

export function MappingEditor({ questions, controls, links, suggestions, selectedId, onSelect, onSetWeight, onRemove, onSetExpected, onSetScopeExclude, onAccept }: MappingEditorProps) {
  const [search, setSearch] = useState('')
  const controlById = useMemo(() => new Map(controls.map((c) => [c.id, c])), [controls])
  const linkCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of links) m.set(l.question_id, (m.get(l.question_id) ?? 0) + 1)
    return m
  }, [links])

  const selectedQuestion = questions.find((x) => x.id === selectedId)
  const selectedLinks = links.filter((l) => l.question_id === selectedId)
  const linkedIds = new Set(selectedLinks.map((l) => l.control_id))
  const selectedSuggestions = suggestions.filter((s) => s.question_id === selectedId && !linkedIds.has(s.control_id))
  const q = search.trim().toLowerCase()
  const addMatches = q
    ? controls.filter((c) => !linkedIds.has(c.id) && (c.code + ' ' + c.name).toLowerCase().includes(q)).slice(0, 8)
    : []

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">
      {/* Master : questions */}
      <div className="border-r border-gray-200 max-h-[520px] overflow-y-auto">
        {questions.map((item) => {
          const n = linkCount.get(item.id) ?? 0
          const on = item.id === selectedId
          return (
            <button key={item.id} type="button" onClick={() => onSelect(item.id)}
              className={`w-full text-left flex items-start gap-2 px-3 py-2.5 border-b border-gray-50 ${on ? 'bg-forest-50 shadow-[inset_3px_0_0_var(--tw-shadow-color)] shadow-forest-500' : 'hover:bg-gray-50'}`}>
              <span className="font-mono text-[10.5px] font-bold text-forest-700 shrink-0">{item.code}</span>
              <span className="text-[11.5px] text-gray-700 leading-snug flex-1 min-w-0">{item.text}</span>
              <span className={`shrink-0 text-[10px] font-mono rounded-full px-1.5 ${n === 0 ? 'text-amber-700 bg-amber-50' : 'text-gray-400 bg-gray-50'}`}>{n === 0 ? '0 ⚠' : n}</span>
            </button>
          )
        })}
      </div>

      {/* Detail : mapping de la question sélectionnée */}
      <div className="p-4">
        {!selectedId ? (
          <p className="text-[12px] text-gray-400 italic">Sélectionnez une question.</p>
        ) : (
          <>
            <p className="text-[13px] font-semibold text-gray-900 mb-2">{selectedQuestion?.text}</p>

            {selectedQuestion && (
              <div className="space-y-2">
                <AnswerValueField
                  key={`exp-${selectedId}`}
                  label="Réponse attendue (conforme)"
                  hint="Une réponse différente de l’attendu, sur un contrôle lié, signale un écart probable (Travaux)."
                  placeholder="Valeur conforme (ex. une option)…"
                  questionType={selectedQuestion.question_type}
                  current={selectedQuestion.expected_answer ?? ''}
                  onSave={(v) => onSetExpected(selectedId, v)}
                />
                <AnswerValueField
                  key={`scope-${selectedId}`}
                  label="Hors périmètre si la réponse est…"
                  hint="Si le client répond ainsi, les contrôles liés seront suggérés à l’exclusion du périmètre (Cadrage)."
                  placeholder="Valeur qui exclut (ex. non)…"
                  questionType={selectedQuestion.question_type}
                  current={selectedQuestion.scope_exclude_value ?? ''}
                  onSave={(v) => onSetScopeExclude(selectedId, v)}
                />
              </div>
            )}

            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2 mt-4">Contrôles liés ({selectedLinks.length})</p>
            {selectedLinks.length === 0 && <p className="text-[11px] text-gray-400 italic mb-2">Aucun contrôle lié.</p>}
            {selectedLinks.map((l) => {
              const c = controlById.get(l.control_id)
              return (
                <div key={l.control_id} className="flex items-center gap-2 border border-gray-200 rounded-lg px-2.5 py-2 mb-1.5">
                  <span className="font-mono text-[11px] font-bold text-forest-700 shrink-0">{c?.code ?? '—'}</span>
                  <span className="text-[12px] text-gray-700 flex-1 min-w-0 truncate">{c?.name}</span>
                  <span className="inline-flex border border-gray-200 rounded-lg overflow-hidden shrink-0">
                    {[1, 2, 3].map((w) => (
                      <button key={w} type="button" onClick={() => onSetWeight(selectedId, l.control_id, w)}
                        className={`text-[10.5px] font-bold px-2 py-1 border-l first:border-l-0 border-gray-200 ${l.weight === w ? (w === 3 ? 'bg-forest-50 text-forest-700' : w === 2 ? 'bg-gold-50 text-gold-600' : 'bg-gray-100 text-gray-500') : 'text-gray-400 hover:bg-gray-50'}`}>
                        {W_LABEL[w]}
                      </button>
                    ))}
                  </span>
                  <button type="button" onClick={() => onRemove(selectedId, l.control_id)} className="text-gray-300 hover:text-red-500 shrink-0"><X size={14} /></button>
                </div>
              )
            })}

            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mt-4 mb-2">Ajouter un contrôle</p>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Code ou intitulé du contrôle…"
              className="w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2 bg-gray-50" />
            {addMatches.map((c) => (
              <button key={c.id} type="button" onClick={() => { onSetWeight(selectedId, c.id, 1); setSearch('') }}
                className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 mt-1 rounded-lg hover:bg-forest-50">
                <span className="font-mono text-[11px] font-bold text-forest-700 shrink-0">{c.code}</span>
                <span className="text-[12px] text-gray-700 truncate">{c.name}</span>
                <span className="ml-auto text-[11px] text-forest-700 font-semibold shrink-0">+ Ajouter</span>
              </button>
            ))}

            {selectedSuggestions.length > 0 && (
              <div className="mt-4 border border-gold-300 bg-gold-50 rounded-xl p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-gold-600 mb-2">✨ Suggestions IA</p>
                {selectedSuggestions.map((s) => {
                  const c = controlById.get(s.control_id)
                  return (
                    <div key={s.control_id} className="flex items-center gap-2 py-1.5 border-t border-gold-200 first:border-t-0">
                      <span className="font-mono text-[11px] font-bold text-forest-700 shrink-0">{c?.code ?? '—'}</span>
                      <span className="text-[11.5px] text-gray-700 flex-1 min-w-0 truncate">{c?.name}</span>
                      <span className="text-[9.5px] font-bold uppercase text-gray-500 shrink-0">{W_LABEL[s.weight]}</span>
                      <button type="button" onClick={() => onAccept(s)} className="text-[11px] font-bold text-forest-700 shrink-0">+ Accepter</button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
