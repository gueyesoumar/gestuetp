import { useState, useCallback } from 'react'
import { Check, X, Sparkles, PartyPopper } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Question } from '../../../types/database.types'

interface Props {
  questions: Question[]
  instanceId: string
  userId: string | null
  readOnly: boolean
}

interface ChatMessage {
  role: 'ai' | 'user'
  content: string
}

export function SmartConversation({ questions, instanceId, userId, readOnly }: Props): JSX.Element {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)

  const currentQuestion = questions[currentIdx] ?? null
  const remaining = questions.length - currentIdx

  const handleAnswer = useCallback(async (value: string): Promise<void> => {
    if (!currentQuestion || !instanceId || !userId) return
    setSaving(true)

    setMessages((prev) => [
      ...prev,
      { role: 'ai', content: currentQuestion.text },
      { role: 'user', content: value },
    ])

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (token) {
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
          question_code: currentQuestion.code,
          response: { value },
          responded_by: userId,
        }),
      })
    }

    setSaving(false)
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1)
    } else {
      setCompleted(true)
    }
  }, [currentQuestion, instanceId, userId, currentIdx, questions.length])

  const handleSkip = useCallback((): void => {
    if (!currentQuestion) return
    setMessages((prev) => [
      ...prev,
      { role: 'ai', content: currentQuestion.text },
      { role: 'user', content: 'Je ne sais pas' },
    ])
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1)
    } else {
      setCompleted(true)
    }
  }, [currentQuestion, currentIdx, questions.length])

  if (questions.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="flex justify-center mb-3"><Check size={24} className="text-green-600" /></div>
        <p className="text-sm font-semibold">Toutes les questions ont une r&eacute;ponse !</p>
        <p className="text-xs text-gray-400 mt-1">Consultez l&rsquo;onglet &laquo; Mon radar &raquo; pour voir votre maturit&eacute;.</p>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="flex justify-center mb-3"><PartyPopper size={28} className="text-gold-500" /></div>
        <p className="text-sm font-semibold mb-1">Questionnaire termin&eacute; !</p>
        <p className="text-xs text-gray-400">Vos r&eacute;ponses ont &eacute;t&eacute; enregistr&eacute;es. L&rsquo;auditeur a &eacute;t&eacute; notifi&eacute;.</p>
      </div>
    )
  }

  // Build response options from question
  const renderOptions = (q: Question): JSX.Element | null => {
    const opts = q.options ?? []
    const qType = q.question_type

    if (qType === 'boolean') {
      return (
        <>
          <ResponseChip label="Oui" icon={<Check size={12} />} onClick={() => handleAnswer('Oui')} disabled={readOnly || saving} active />
          <ResponseChip label="Non" icon={<X size={12} />} onClick={() => handleAnswer('Non')} disabled={readOnly || saving} />
        </>
      )
    }

    if ((qType === 'single_choice' || qType === 'multiple_choice') && opts.length > 0) {
      return (
        <>
          {opts.map((opt) => (
            <ResponseChip key={opt} label={opt} onClick={() => handleAnswer(opt)} disabled={readOnly || saving} />
          ))}
        </>
      )
    }

    return null
  }

  return (
    <div className="flex gap-4">
      {/* Chat area */}
      <div className="flex-1">
        {/* Previous messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 mb-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-forest-700 to-forest-500 flex items-center justify-center shrink-0">
                <Sparkles size={15} className="text-white" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-xl p-3 text-xs leading-relaxed ${
              msg.role === 'ai'
                ? 'bg-white border border-gray-200 rounded-tl-none text-gray-700'
                : 'bg-forest-700 text-white rounded-tr-none'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Current question */}
        {currentQuestion && (
          <div className="flex gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-forest-700 to-forest-500 flex items-center justify-center shrink-0">
              <span className="text-white text-sm">&#10024;</span>
            </div>
            <div className="flex-1">
              <div className="bg-white border border-gray-200 rounded-xl rounded-tl-none p-4">
                <p className="text-xs text-gray-700 leading-relaxed font-medium">{currentQuestion.text}</p>
                {currentQuestion.description && (
                  <p className="text-[10px] text-gray-400 mt-2">{currentQuestion.description}</p>
                )}

                <div className="flex gap-2 mt-4 flex-wrap">
                  {renderOptions(currentQuestion)}
                  <ResponseChip label="Je ne sais pas" onClick={handleSkip} disabled={readOnly || saving} skip />
                </div>
              </div>

              {/* Free text input for text questions or when no options */}
              {(currentQuestion.question_type === 'text' || !(currentQuestion.options && currentQuestion.options.length > 0)) && (
                <FreeTextInput onSubmit={handleAnswer} disabled={readOnly || saving} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mini sidebar */}
      <div className="w-44 shrink-0">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Progression</p>
          <p className="text-xs text-gray-700 font-medium">{remaining} question{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''}</p>
          <div className="h-1.5 bg-gray-100 rounded-full mt-2">
            <div className="h-1.5 bg-forest-500 rounded-full transition-all" style={{ width: `${((currentIdx) / questions.length) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ResponseChip({ label, icon, onClick, disabled, active, skip }: {
  label: string; icon?: React.ReactNode; onClick: () => void; disabled: boolean; active?: boolean; skip?: boolean
}): JSX.Element {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1 ${
        skip ? 'border border-dashed border-gray-200 text-gray-300 hover:border-gray-400' :
        active ? 'border-2 border-forest-300 bg-forest-50 text-forest-700 hover:bg-forest-100' :
        'border-2 border-gray-200 text-gray-700 hover:border-forest-300 hover:bg-forest-50'
      }`}>
      {icon}{label}
    </button>
  )
}

function FreeTextInput({ onSubmit, disabled }: { onSubmit: (v: string) => void; disabled: boolean }): JSX.Element {
  const [text, setText] = useState('')
  return (
    <div className="flex gap-2 mt-2">
      <input value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Tapez votre r&eacute;ponse..."
        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-forest-500"
        disabled={disabled}
        onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { onSubmit(text.trim()); setText('') } }}
      />
      <button onClick={() => { if (text.trim()) { onSubmit(text.trim()); setText('') } }} disabled={disabled || !text.trim()}
        className="px-4 py-2.5 bg-forest-700 text-white rounded-xl text-xs font-semibold hover:bg-forest-900 transition-colors disabled:opacity-50">
        Envoyer
      </button>
    </div>
  )
}
