import { useState, useCallback } from 'react'
import { Sparkles, Check, Pencil, MessageCircle, Brain, Square } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Question } from '../../../types/database.types'
import type { SmartAnswer } from './SmartInterviewContainer'

function EditableAnswer({ answer, onSave, onCancel }: { answer: SmartAnswer; onSave: (text: string) => void; onCancel: () => void }): JSX.Element {
  const [text, setText] = useState(answer.answer)
  return (
    <div className="px-3 py-2.5 border-t border-gold-200 bg-gold-50">
      <textarea value={text} onChange={(e) => setText(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] text-gray-700 leading-relaxed outline-none focus:border-forest-500 resize-y min-h-[60px] bg-white"
      />
      <div className="flex gap-2 mt-2">
        <button onClick={() => onSave(text.trim())}
          className="px-3 py-1 bg-forest-700 text-white rounded text-[10px] font-semibold hover:bg-forest-900 transition-colors">
          Valider la modification
        </button>
        <button onClick={onCancel}
          className="px-3 py-1 bg-white text-gray-500 border border-gray-200 rounded text-[10px] hover:border-gray-400 transition-colors">
          Annuler
        </button>
      </div>
    </div>
  )
}

interface Props {
  missionId: string
  questions: Question[]
  instanceId: string
  userId: string | null
  initialResponses: Map<string, unknown>
  prefilledAnswers: SmartAnswer[]
  onPrefilledAnswersChange: (answers: SmartAnswer[]) => void
  analyzing: boolean
  onAnalyzingChange: (v: boolean) => void
  readOnly: boolean
  onGoToConversation: () => void
}

export function SmartPrefilledAnswers({
  missionId, questions, instanceId, userId, initialResponses,
  prefilledAnswers, onPrefilledAnswersChange, analyzing, onAnalyzingChange,
  readOnly, onGoToConversation,
}: Props): JSX.Element {
  const [error, setError] = useState<string | null>(null)
  const [editingCode, setEditingCode] = useState<string | null>(null)

  const alreadyAnswered = questions.filter((q) => initialResponses.has(q.code))
  const aiPrefilled = questions.filter((q) =>
    !initialResponses.has(q.code) && prefilledAnswers.some((a) => a.questionCode === q.code)
  )
  const unanswered = questions.filter((q) =>
    !initialResponses.has(q.code) && !prefilledAnswers.some((a) => a.questionCode === q.code)
  )

  const handleAnalyze = useCallback(async (): Promise<void> => {
    onAnalyzingChange(true)
    setError(null)

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) { setError('Non authentifi\u00e9'); onAnalyzingChange(false); return }

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-questionnaire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ mission_id: missionId, questions: questions.map((q) => ({ code: q.code, label: q.text, description: q.description })) }),
    })

    if (!res.ok) {
      setError('Erreur lors de l\u2019analyse IA')
      onAnalyzingChange(false)
      return
    }

    const data = await res.json() as { answers: SmartAnswer[] }
    onPrefilledAnswersChange(data.answers ?? [])
    onAnalyzingChange(false)
  }, [missionId, questions, onPrefilledAnswersChange, onAnalyzingChange])

  const handleValidate = useCallback(async (questionCode: string): Promise<void> => {
    const answer = prefilledAnswers.find((a) => a.questionCode === questionCode)
    if (!answer || !instanceId || !userId) return

    // Save to questionnaire_responses
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) return

    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/questionnaire_responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        instance_id: instanceId,
        question_code: questionCode,
        response: { value: answer.answer },
        responded_by: userId,
      }),
    })

    onPrefilledAnswersChange(
      prefilledAnswers.map((a) => a.questionCode === questionCode ? { ...a, validated: true } : a)
    )
  }, [prefilledAnswers, instanceId, userId, onPrefilledAnswersChange])

  const handleEditSave = useCallback(async (questionCode: string, newText: string): Promise<void> => {
    // Update the answer text locally
    onPrefilledAnswersChange(
      prefilledAnswers.map((a) => a.questionCode === questionCode ? { ...a, answer: newText } : a)
    )
    setEditingCode(null)
    // Then validate with the new text
    const answer = prefilledAnswers.find((a) => a.questionCode === questionCode)
    if (!answer || !instanceId || !userId) return

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) return

    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/questionnaire_responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        instance_id: instanceId,
        question_code: questionCode,
        response: { value: newText },
        responded_by: userId,
      }),
    })

    onPrefilledAnswersChange(
      prefilledAnswers.map((a) => a.questionCode === questionCode ? { ...a, answer: newText, validated: true } : a)
    )
  }, [prefilledAnswers, instanceId, userId, onPrefilledAnswersChange])

  return (
    <div>
      {error && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
      )}

      {/* Analyze button if no prefilled answers yet */}
      {prefilledAnswers.length === 0 && !analyzing && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center mb-4">
          <div className="flex justify-center mb-3"><Sparkles size={24} className="text-gold-500" /></div>
          <p className="text-sm font-semibold mb-1">Analyse IA des documents</p>
          <p className="text-xs text-gray-400 mb-4 max-w-md mx-auto">
            L&rsquo;IA va analyser les documents d&eacute;pos&eacute;s et pr&eacute;-remplir automatiquement les r&eacute;ponses du questionnaire.
          </p>
          <button onClick={handleAnalyze} disabled={readOnly}
            className="px-6 py-2.5 bg-forest-700 text-white rounded-lg text-sm font-semibold hover:bg-forest-900 transition-colors disabled:opacity-50">
            <Sparkles size={15} className="inline mr-1" />Analyser et pr&eacute;-remplir
          </button>
        </div>
      )}

      {/* Analyzing state */}
      {analyzing && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center mb-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gold-50 border-2 border-gold-200 flex items-center justify-center animate-pulse">
            <Brain size={28} className="text-gold-500" />
          </div>
          <p className="text-sm font-semibold mb-1">Analyse en cours...</p>
          <p className="text-xs text-gray-400">L&rsquo;IA parcourt vos documents pour identifier les r&eacute;ponses</p>
        </div>
      )}

      {/* Already answered (from previous responses) */}
      {alreadyAnswered.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-green-600 mb-2">
            <Check size={12} className="inline mr-0.5" />{alreadyAnswered.length} d&eacute;j&agrave; r&eacute;pondu{alreadyAnswered.length > 1 ? 'es' : 'e'}
          </p>
          {alreadyAnswered.map((q) => (
            <div key={q.code} className="flex items-center gap-2 p-2.5 mb-1.5 bg-green-50 border border-green-100 rounded-lg">
              <span className="font-mono text-[10px] font-semibold text-forest-700">{q.code}</span>
              <span className="text-xs text-gray-700 flex-1 truncate">{q.text}</span>
              <span className="text-[10px] text-green-600 font-medium inline-flex items-center gap-0.5"><Check size={10} /> R&eacute;pondu</span>
            </div>
          ))}
        </div>
      )}

      {/* AI pre-filled answers */}
      {aiPrefilled.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-forest-700 mb-2 pb-1 border-b-2 border-forest-100">
            <Sparkles size={12} className="inline mr-0.5" />R&eacute;ponses IA &agrave; valider
          </p>
          {aiPrefilled.map((q) => {
            const answer = prefilledAnswers.find((a) => a.questionCode === q.code)
            if (!answer) return null
            return (
              <div key={q.code} className="border border-gray-200 rounded-lg mb-2 bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className="font-mono text-[10px] font-semibold text-forest-700">{q.code}</span>
                  <span className="text-xs font-medium flex-1">{q.text}</span>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                    answer.confidence >= 80 ? 'bg-forest-100 text-forest-700' :
                    answer.confidence >= 60 ? 'bg-gold-50 text-gold-600' :
                    'bg-red-50 text-red-500'
                  }`}>{answer.confidence}%</span>
                  {answer.sourceDoc && (
                    <span className="text-[9px] text-gray-300">{answer.sourceDoc}</span>
                  )}
                </div>
                {editingCode === q.code ? (
                  <EditableAnswer
                    answer={answer}
                    onSave={(text) => handleEditSave(q.code, text)}
                    onCancel={() => setEditingCode(null)}
                  />
                ) : (
                  <div className={`px-3 py-2.5 border-t flex items-center gap-2 ${
                    answer.validated ? 'bg-green-50 border-green-100' : 'bg-forest-50 border-forest-100'
                  }`}>
                    <Sparkles size={11} className="text-gold-500" />
                    <p className="text-[11px] text-gray-700 flex-1">{answer.answer}</p>
                    {answer.validated ? (
                      <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded inline-flex items-center gap-0.5"><Check size={10} /> Valid&eacute;</span>
                    ) : !readOnly ? (
                      <>
                        <button onClick={() => handleValidate(q.code)}
                          className="px-2.5 py-1 bg-green-500 text-white rounded text-[10px] font-semibold hover:bg-green-600 transition-colors">
                          <Check size={10} /> Correct
                        </button>
                        <button onClick={() => setEditingCode(q.code)}
                          className="px-2.5 py-1 bg-white text-gray-500 border border-gray-200 rounded text-[10px] font-medium hover:border-forest-300 transition-colors">
                          <Pencil size={10} /> Modifier
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Unanswered questions */}
      {unanswered.length > 0 && prefilledAnswers.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 pb-1 border-b-2 border-gray-100">
            <Square size={12} className="inline mr-0.5" />{unanswered.length} question{unanswered.length > 1 ? 's' : ''} restante{unanswered.length > 1 ? 's' : ''}
          </p>
          {unanswered.map((q) => (
            <div key={q.code} className="flex items-center gap-2 p-2.5 mb-1.5 border border-dashed border-gray-200 rounded-lg opacity-60">
              <span className="font-mono text-[10px] font-semibold text-gray-300">{q.code}</span>
              <span className="text-xs text-gray-300 flex-1 truncate">{q.text}</span>
              <span className="text-[9px] text-gray-300 bg-gray-50 px-2 py-0.5 rounded-full">Non couverte</span>
            </div>
          ))}
          {!readOnly && (
            <div className="text-center mt-3">
              <button onClick={onGoToConversation}
                className="px-5 py-2.5 bg-forest-700 text-white rounded-lg text-xs font-semibold hover:bg-forest-900 transition-colors">
                <MessageCircle size={13} className="inline mr-0.5" />R&eacute;pondre aux {unanswered.length} questions restantes
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
