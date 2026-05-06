import { useState, useMemo } from 'react'
import { Send, Calendar, Sparkles, Plus, X, Check } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useTemplateQuestions } from './useTemplateQuestions'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import type { Question } from '../../../types/database.types'

interface LaunchQuestionnairePanelProps {
  missionId: string
  frameworkId: string
  onLaunched: () => void
}

interface CustomQuestion {
  code: string
  text: string
  question_type: 'boolean' | 'single_choice' | 'multiple_choice' | 'text' | 'textarea'
  options: string[] | null
  is_required: boolean
}

const SECTION_LABELS: Record<string, string> = {
  GOV: 'Gouvernance SSI',
  MAT: 'Maturité & historique',
  OPS: 'Sécurité opérationnelle',
  INC: 'Incidents & continuité',
  ATT: 'Attentes & contraintes',
  CTX: 'Contexte de l’entité',
  ORG: 'Organisation',
  PER: 'Sécurité physique',
  ACQ: 'Acquisition',
  ACT: 'Actifs',
  FRN: 'Fournisseurs',
  PHY: 'Physique',
  LOG: 'Sécurité logique',
  EXP: 'Exploitation',
  CLM: 'Cloud',
  AUD: 'Audit',
}

function defaultDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
}

function groupBySection(questions: Question[]): Map<string, Question[]> {
  const groups = new Map<string, Question[]>()
  for (const q of questions) {
    const prefix = q.code.split('-')[0] ?? q.code.substring(0, 3)
    const list = groups.get(prefix) ?? []
    list.push(q)
    groups.set(prefix, list)
  }
  return groups
}

export function LaunchQuestionnairePanel({ missionId, frameworkId, onLaunched }: LaunchQuestionnairePanelProps) {
  const { questions, templateName, loading, error } = useTemplateQuestions(frameworkId)
  const [includedCodes, setIncludedCodes] = useState<Set<string>>(new Set())
  const [hydrated, setHydrated] = useState(false)
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([])
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customDraft, setCustomDraft] = useState<CustomQuestion>({
    code: '', text: '', question_type: 'textarea', options: null, is_required: false,
  })
  const [dueDate, setDueDate] = useState<string>(defaultDueDate)
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)

  // Hydrate "all included" by default once questions arrive
  if (!hydrated && questions.length > 0) {
    setIncludedCodes(new Set(questions.map((q) => q.code)))
    setHydrated(true)
  }

  const sections = useMemo(() => groupBySection(questions), [questions])

  const totalIncluded = includedCodes.size + customQuestions.length

  const toggleQuestion = (code: string) => {
    setIncludedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code); else next.add(code)
      return next
    })
  }

  const toggleSection = (prefix: string) => {
    const sectionQuestions = sections.get(prefix) ?? []
    const codes = sectionQuestions.map((q) => q.code)
    const allIncluded = codes.every((c) => includedCodes.has(c))
    setIncludedCodes((prev) => {
      const next = new Set(prev)
      if (allIncluded) {
        codes.forEach((c) => next.delete(c))
      } else {
        codes.forEach((c) => next.add(c))
      }
      return next
    })
  }

  const handleAddCustom = () => {
    if (customDraft.code.trim().length === 0 || customDraft.text.trim().length === 0) return
    setCustomQuestions((prev) => [...prev, { ...customDraft }])
    setCustomDraft({ code: '', text: '', question_type: 'textarea', options: null, is_required: false })
    setShowCustomForm(false)
  }

  const handleRemoveCustom = (code: string) => {
    setCustomQuestions((prev) => prev.filter((q) => q.code !== code))
  }

  const handleLaunch = async (): Promise<void> => {
    setLaunching(true)
    setLaunchError(null)
    const { data, error: fnError } = await supabase.functions.invoke('launch-questionnaire', {
      body: {
        mission_id: missionId,
        included_codes: Array.from(includedCodes),
        custom_questions: customQuestions.length > 0 ? customQuestions : undefined,
        due_date: dueDate || null,
      },
    })
    setLaunching(false)
    if (fnError || data?.error) {
      setLaunchError(fnError?.message ?? data?.error ?? 'Erreur.')
      return
    }
    onLaunched()
  }

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />
  if (questions.length === 0) {
    return (
      <div className="bg-gold-50 border border-gold-200 rounded-xl p-5 text-center">
        <p className="text-[13px] text-gold-700">Aucun questionnaire disponible pour ce référentiel.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {launchError && <ErrorAlert message={launchError} />}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-[#FAFAFA] flex items-center gap-3">
          <Sparkles size={15} className="text-gold-500" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-gray-900">Personnaliser et envoyer le questionnaire</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{templateName} &middot; sélectionnez les questions à envoyer au client.</p>
          </div>
          <div className="text-[11px] font-mono font-bold text-forest-700 bg-forest-50 px-2 py-1 rounded">
            {totalIncluded}/{questions.length + customQuestions.length}
          </div>
        </div>

        {/* Sections + questions */}
        <div className="max-h-[400px] overflow-y-auto px-5 py-3 space-y-3">
          {[...sections.entries()].map(([prefix, sectionQuestions]) => {
            const total = sectionQuestions.length
            const checked = sectionQuestions.filter((q) => includedCodes.has(q.code)).length
            const allChecked = checked === total
            const noneChecked = checked === 0
            return (
              <div key={prefix} className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-[10px] font-bold text-forest-700 bg-forest-100 px-2 py-0.5 rounded font-mono">{prefix}</span>
                  <span className="text-[12px] font-semibold text-gray-700 flex-1">{SECTION_LABELS[prefix] ?? prefix}</span>
                  <button
                    type="button"
                    onClick={() => toggleSection(prefix)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      allChecked ? 'bg-success-bg text-success' : noneChecked ? 'bg-gray-100 text-gray-500' : 'bg-gold-50 text-gold-700'
                    }`}
                    style={{ background: allChecked ? '#E8F5EE' : noneChecked ? '#F4F4F4' : '#FBF3DC', color: allChecked ? '#27AE60' : noneChecked ? '#707070' : '#8E7128' }}
                  >
                    {allChecked ? 'Tout désactiver' : 'Tout activer'} · {checked}/{total}
                  </button>
                </div>
                <div>
                  {sectionQuestions.map((q) => {
                    const isOn = includedCodes.has(q.code)
                    return (
                      <button
                        key={q.code}
                        type="button"
                        onClick={() => toggleQuestion(q.code)}
                        className={`w-full text-left flex items-start gap-2.5 px-3 py-2 border-b border-gray-50 last:border-b-0 hover:bg-forest-50/40 transition-colors ${isOn ? '' : 'opacity-50'}`}
                      >
                        <span className={`mt-0.5 w-4 h-4 rounded border-1.5 flex items-center justify-center shrink-0 ${
                          isOn ? 'bg-forest-700 border-forest-700' : 'border-gray-300 bg-white'
                        }`}>
                          {isOn && <Check size={11} className="text-white" />}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-forest-700 mt-0.5 shrink-0 w-14">
                          {q.code}
                        </span>
                        <span className="flex-1 text-[12px] text-gray-700">{q.text}</span>
                        {q.prefill_source && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-forest-50 text-forest-700 border border-forest-200 mt-0.5">
                            pré-rempli
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Custom questions */}
          {customQuestions.length > 0 && (
            <div className="border border-gold-300 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gold-50 border-b border-gold-200">
                <span className="text-[10px] font-bold text-gold-700 bg-gold-100 px-2 py-0.5 rounded font-mono">CUSTOM</span>
                <span className="text-[12px] font-semibold text-gold-700 flex-1">Questions custom mission</span>
                <span className="text-[10px] font-semibold text-gold-700">{customQuestions.length}</span>
              </div>
              <div>
                {customQuestions.map((cq) => (
                  <div key={cq.code} className="flex items-start gap-2.5 px-3 py-2 border-b border-gold-100 last:border-b-0">
                    <span className="mt-0.5 w-4 h-4 rounded border-1.5 bg-gold-500 border-gold-500 flex items-center justify-center shrink-0">
                      <Check size={11} className="text-white" />
                    </span>
                    <span className="font-mono text-[10px] font-bold text-gold-700 mt-0.5 shrink-0 w-14">
                      {cq.code}
                    </span>
                    <span className="flex-1 text-[12px] text-gray-700">{cq.text}</span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gold-50 text-gold-700 border border-gold-300 mt-0.5">
                      {cq.question_type}
                    </span>
                    <button onClick={() => handleRemoveCustom(cq.code)} className="text-gray-300 hover:text-red-500" aria-label="Retirer">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add custom question */}
          {showCustomForm ? (
            <div className="border-2 border-dashed border-gold-300 rounded-lg p-3 bg-gold-50/40">
              <p className="text-[11px] font-bold text-gold-700 uppercase tracking-wide mb-2">Nouvelle question custom</p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={customDraft.code}
                  onChange={(e) => setCustomDraft({ ...customDraft, code: e.target.value })}
                  placeholder="Code (ex: SECU-CLOUD-1)"
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-[12px] font-mono outline-none focus:border-gold-500"
                />
                <textarea
                  value={customDraft.text}
                  onChange={(e) => setCustomDraft({ ...customDraft, text: e.target.value })}
                  placeholder="Question..."
                  rows={2}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-[12px] outline-none focus:border-gold-500 resize-y"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={customDraft.question_type}
                    onChange={(e) => setCustomDraft({ ...customDraft, question_type: e.target.value as CustomQuestion['question_type'] })}
                    className="px-2 py-1 border border-gray-200 rounded text-[11px] outline-none focus:border-gold-500"
                  >
                    <option value="textarea">Texte long</option>
                    <option value="text">Texte court</option>
                    <option value="boolean">Oui / Non</option>
                  </select>
                  <label className="text-[11px] inline-flex items-center gap-1 text-gray-600">
                    <input
                      type="checkbox"
                      checked={customDraft.is_required}
                      onChange={(e) => setCustomDraft({ ...customDraft, is_required: e.target.checked })}
                    />
                    Obligatoire
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleAddCustom} className="text-[11px] font-semibold px-3 py-1 bg-gold-500 text-forest-900 rounded hover:bg-gold-600">
                    Ajouter
                  </button>
                  <button onClick={() => setShowCustomForm(false)} className="text-[11px] text-gray-500 px-3 py-1 hover:text-gray-700 inline-flex items-center gap-1">
                    <X size={11} /> Annuler
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustomForm(true)}
              className="w-full border-2 border-dashed border-gold-300 rounded-lg py-2.5 text-[12px] font-semibold text-gold-700 hover:bg-gold-50 transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <Plus size={13} /> Ajouter une question custom
            </button>
          )}
        </div>

        {/* Footer with due date + send */}
        <div className="px-5 py-3 border-t border-gray-200 bg-[#FAFAFA] flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[12px] text-gray-700">
            <Calendar size={13} className="text-gray-400" />
            <span>Échéance</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-2 py-1 border border-gray-200 rounded text-[12px] outline-none focus:border-forest-500"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleLaunch()}
            disabled={launching || totalIncluded === 0}
            className="ml-auto bg-forest-700 text-white px-5 py-2 rounded-lg text-[13px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
          >
            <Send size={13} /> {launching ? 'Envoi...' : `Envoyer (${totalIncluded} questions)`}
          </button>
        </div>
      </div>
    </div>
  )
}
