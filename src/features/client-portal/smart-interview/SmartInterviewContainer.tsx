import { useState } from 'react'
import { SmartPrefilledAnswers } from './SmartPrefilledAnswers'
import { SmartConversation } from './SmartConversation'
import { SmartRadar } from './SmartRadar'
import type { Question } from '../../../types/database.types'

export interface SmartAnswer {
  questionCode: string
  questionLabel: string
  answer: string
  confidence: number
  sourceDoc: string | null
  validated: boolean
}

interface SmartInterviewContainerProps {
  missionId: string
  missionName: string
  questions: Question[]
  instanceId: string
  userId: string | null
  initialResponses: Map<string, unknown>
  readOnly: boolean
  documentsCount: number
}

type SmartTab = 'prefill' | 'conversation' | 'radar'

export function SmartInterviewContainer({
  missionId, missionName, questions, instanceId, userId,
  initialResponses, readOnly, documentsCount,
}: SmartInterviewContainerProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<SmartTab>('prefill')
  const [prefilledAnswers, setPrefilledAnswers] = useState<SmartAnswer[]>([])
  const [analyzing, setAnalyzing] = useState(false)

  const answeredCount = initialResponses.size + prefilledAnswers.filter((a) => a.validated).length
  const totalCount = questions.length
  const unansweredQuestions = questions.filter((q) =>
    !initialResponses.has(q.code) && !prefilledAnswers.some((a) => a.questionCode === q.code && a.validated)
  )

  const tabs: { key: SmartTab; label: string; icon: string }[] = [
    { key: 'prefill', label: 'R\u00e9ponses IA', icon: '\u2728' },
    { key: 'conversation', label: 'Conversation', icon: '\uD83D\uDCAC' },
    { key: 'radar', label: 'Mon radar', icon: '\uD83D\uDCCA' },
  ]

  return (
    <div>
      {/* Document-awareness banner */}
      <div className="flex items-center gap-3 p-3 bg-forest-50 border border-forest-100 rounded-xl mb-4">
        <div className="w-9 h-9 rounded-lg bg-forest-100 flex items-center justify-center shrink-0">
          <span className="text-base">&#128206;</span>
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-forest-900">
            {documentsCount > 0
              ? `${documentsCount} document${documentsCount > 1 ? 's' : ''} d\u00e9pos\u00e9${documentsCount > 1 ? 's' : ''} \u2192 ${prefilledAnswers.length} r\u00e9ponse${prefilledAnswers.length > 1 ? 's' : ''} pr\u00e9-remplie${prefilledAnswers.length > 1 ? 's' : ''}`
              : 'D\u00e9posez vos documents pour pr\u00e9-remplir le questionnaire automatiquement'}
          </p>
          <p className="text-[10px] text-forest-700 mt-0.5">
            {answeredCount}/{totalCount} questions r&eacute;pondues
          </p>
        </div>
        <div className="w-10 h-10 rounded-full border-3 border-forest-500 flex items-center justify-center shrink-0" style={{ borderWidth: '3px' }}>
          <span className="text-xs font-bold text-forest-700">{answeredCount}/{totalCount}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${
              activeTab === tab.key
                ? 'bg-forest-700 text-white border-forest-700'
                : 'bg-white text-gray-500 border-gray-200 hover:border-forest-300'
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'prefill' && (
        <SmartPrefilledAnswers
          missionId={missionId}
          questions={questions}
          instanceId={instanceId}
          userId={userId}
          initialResponses={initialResponses}
          prefilledAnswers={prefilledAnswers}
          onPrefilledAnswersChange={setPrefilledAnswers}
          analyzing={analyzing}
          onAnalyzingChange={setAnalyzing}
          readOnly={readOnly}
          onGoToConversation={() => setActiveTab('conversation')}
        />
      )}
      {activeTab === 'conversation' && (
        <SmartConversation
          missionId={missionId}
          questions={unansweredQuestions}
          instanceId={instanceId}
          userId={userId}
          readOnly={readOnly}
        />
      )}
      {activeTab === 'radar' && (
        <SmartRadar
          questions={questions}
          initialResponses={initialResponses}
          prefilledAnswers={prefilledAnswers}
        />
      )}
    </div>
  )
}
