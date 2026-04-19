import { useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useMissionQuestionnaire } from '../features/missions/useMissionQuestionnaire'
import { QuestionnaireWizard } from '../features/questionnaire/QuestionnaireWizard'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'

export function QuestionnaireClientPage() {
  const { id: missionId } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { instance, questions, responses, loading, error } = useMissionQuestionnaire(missionId)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>
  if (error) return <div className="p-8"><ErrorAlert message={error} /></div>
  if (!instance) return <div className="p-8"><ErrorAlert message="Questionnaire introuvable." /></div>

  // Build initial responses map from existing data
  const initialResponses = new Map<string, unknown>()
  for (const r of responses) {
    const val = r.response
    if (val && typeof val === 'object' && 'value' in val) {
      initialResponses.set(r.question_code, (val as { value: unknown }).value)
    }
  }

  const templateName = (instance as unknown as { snapshot: { template: { name: string } } }).snapshot?.template?.name ?? 'Questionnaire'

  return (
    <div className="min-h-screen bg-[#FAFAF8] py-8 px-4">
      <div className="max-w-[640px] mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-gray-900">{templateName}</h1>
          <p className="text-[13px] text-gray-400 mt-1">Remplissez le questionnaire &eacute;tape par &eacute;tape. Vos r&eacute;ponses sont sauvegard&eacute;es automatiquement.</p>
        </div>

        <QuestionnaireWizard
          questions={questions}
          instanceId={instance.id}
          userId={profile?.id ?? null}
          initialResponses={initialResponses}
          onComplete={() => { window.location.href = '/missions' }}
        />
      </div>
    </div>
  )
}
