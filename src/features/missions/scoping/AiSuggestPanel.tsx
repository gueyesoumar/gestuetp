import { useState } from 'react'
import { Sparkles, X, Loader2, Plus, Check } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'

export type AiQuestionType = 'text' | 'textarea' | 'boolean' | 'date' | 'number' | 'scale_percent' | 'file' | 'organigramme'

export interface AiSuggestion {
  code: string
  text: string
  question_type: AiQuestionType
  section: string | null
  rationale: string
}

interface AiSuggestPanelProps {
  missionId: string
  frameworkId: string
  sections: Array<{ code: string; label?: string }>
  existingCodes: string[]
  onAdd: (picked: AiSuggestion[]) => void
  onClose: () => void
}

const TYPE_LABELS: Record<AiQuestionType, string> = {
  text: 'Texte court',
  textarea: 'Texte long',
  boolean: 'Oui / Non',
  date: 'Date',
  number: 'Nombre',
  scale_percent: 'Échelle %',
  file: 'Document',
  organigramme: 'Organigramme',
}

export function AiSuggestPanel({ missionId, frameworkId, sections, existingCodes, onAdd, onClose }: AiSuggestPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [edits, setEdits] = useState<Record<string, Partial<AiSuggestion>>>({})

  const handleGenerate = async (): Promise<void> => {
    if (prompt.trim().length === 0) return
    setLoading(true)
    setError(null)
    setSuggestions([])
    setPicked(new Set())
    setEdits({})
    const { data, error: fnError } = await supabase.functions.invoke('suggest-custom-questions', {
      body: {
        mission_id: missionId,
        framework_id: frameworkId,
        prompt: prompt.trim(),
        sections,
        existing_codes: existingCodes,
      },
    })
    setLoading(false)
    if (fnError || (data && (data as { error?: string }).error)) {
      setError(fnError?.message ?? (data as { error?: string }).error ?? 'Erreur IA.')
      return
    }
    const result = (data as { suggestions?: AiSuggestion[] })?.suggestions ?? []
    setSuggestions(result)
    setPicked(new Set(result.map((s) => s.code)))
  }

  const togglePick = (code: string) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code); else next.add(code)
      return next
    })
  }

  const updateEdit = (code: string, patch: Partial<AiSuggestion>) => {
    setEdits((prev) => ({ ...prev, [code]: { ...(prev[code] ?? {}), ...patch } }))
  }

  const handleConfirm = () => {
    const finals = suggestions
      .filter((s) => picked.has(s.code))
      .map((s) => ({ ...s, ...(edits[s.code] ?? {}) }))
    onAdd(finals)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-gray-200 bg-forest-50 flex items-center gap-3">
          <Sparkles size={16} className="text-forest-700" />
          <div className="flex-1">
            <p className="text-[14px] font-bold text-forest-900">Suggérer des questions avec l&apos;IA</p>
            <p className="text-[11px] text-forest-700 mt-0.5">Décrivez ce que vous voulez creuser, l&apos;IA propose des questions adaptées au référentiel et au client.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {error && <div className="mb-3"><ErrorAlert message={error} /></div>}

          <div className="mb-4">
            <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
              Que voulez-vous creuser ?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Le client externalise sa SOC, je veux des questions sur le pilotage du prestataire et la transmission des alertes."
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500 resize-y"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-gray-400">{prompt.length} / 2000</span>
              <button
                onClick={() => void handleGenerate()}
                disabled={loading || prompt.trim().length === 0}
                className="bg-forest-700 text-white px-4 py-1.5 rounded-lg text-[12px] font-semibold hover:bg-forest-900 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {loading ? <><Loader2 size={12} className="animate-spin" /> Génération...</> : <><Sparkles size={12} /> Générer</>}
              </button>
            </div>
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''} &middot; {picked.size} sélectionnée{picked.size > 1 ? 's' : ''}
              </p>
              {suggestions.map((s) => {
                const isPicked = picked.has(s.code)
                const edit = edits[s.code] ?? {}
                const text = (edit.text as string | undefined) ?? s.text
                const section = edit.section !== undefined ? edit.section : s.section
                const qtype = (edit.question_type as AiQuestionType | undefined) ?? s.question_type
                return (
                  <div key={s.code} className={`border rounded-lg p-3 transition-colors ${isPicked ? 'border-forest-300 bg-forest-50/40' : 'border-gray-200 bg-white opacity-60'}`}>
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => togglePick(s.code)}
                        className={`mt-0.5 w-4 h-4 rounded border-1.5 flex items-center justify-center shrink-0 ${
                          isPicked ? 'bg-forest-700 border-forest-700' : 'border-gray-300 bg-white'
                        }`}
                        aria-label={isPicked ? 'Désélectionner' : 'Sélectionner'}
                      >
                        {isPicked && <Check size={11} className="text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-mono text-[10px] font-bold text-forest-700 bg-forest-100 px-1.5 py-0.5 rounded">{s.code}</span>
                          <select
                            value={section ?? ''}
                            onChange={(e) => updateEdit(s.code, { section: e.target.value === '' ? null : e.target.value })}
                            disabled={!isPicked}
                            className="text-[10px] px-1.5 py-0.5 border border-gray-200 rounded outline-none focus:border-forest-500 disabled:opacity-50"
                          >
                            <option value="">Hors section</option>
                            {sections.map((sec) => (
                              <option key={sec.code} value={sec.code}>{sec.code}{sec.label ? ` · ${sec.label}` : ''}</option>
                            ))}
                          </select>
                          <select
                            value={qtype}
                            onChange={(e) => updateEdit(s.code, { question_type: e.target.value as AiQuestionType })}
                            disabled={!isPicked}
                            className="text-[10px] px-1.5 py-0.5 border border-gray-200 rounded outline-none focus:border-forest-500 disabled:opacity-50"
                          >
                            {(Object.keys(TYPE_LABELS) as AiQuestionType[]).map((t) => (
                              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          value={text}
                          onChange={(e) => updateEdit(s.code, { text: e.target.value })}
                          disabled={!isPicked}
                          rows={2}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-[12px] text-gray-700 outline-none focus:border-forest-500 resize-y disabled:opacity-50 disabled:bg-gray-50"
                        />
                        {s.rationale && (
                          <p className="text-[11px] text-gray-500 italic mt-1.5">&laquo; {s.rationale} &raquo;</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!loading && suggestions.length === 0 && !error && (
            <div className="text-center py-8 text-[12px] text-gray-400">
              Aucune suggestion pour l&apos;instant. Décrivez votre besoin ci-dessus puis cliquez sur G&eacute;n&eacute;rer.
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 bg-[#FAFAFA] flex items-center gap-2">
          <button onClick={onClose} className="text-[12px] text-gray-500 hover:text-gray-700 px-3 py-2">
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={picked.size === 0}
            className="ml-auto bg-gold-500 text-forest-900 px-4 py-2 rounded-lg text-[12px] font-semibold hover:bg-gold-600 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Plus size={12} /> Ajouter {picked.size > 0 ? `(${picked.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
