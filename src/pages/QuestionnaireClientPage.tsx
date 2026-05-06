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

  const snapshot = instance.snapshot as { template?: { name?: string } } | null
  const templateName = snapshot?.template?.name ?? 'Questionnaire'

  // Multi-respondent : filtrer les questions selon les sections assignées au profile courant
  const assignees = instance.section_assignees ?? {}
  const myUserId = profile?.id
  const assignedSections = new Set<string>()
  for (const [section, userId] of Object.entries(assignees)) {
    if (userId === myUserId) assignedSections.add(section)
  }
  const filteredQuestions = (() => {
    if (!myUserId || Object.keys(assignees).length === 0) return questions
    return questions.filter((q) => {
      const section = q.code.split('-')[0]
      const assignee = assignees[section]
      // Si la section n'a pas d'assignee → visible par tous
      if (!assignee) return true
      // Sinon, visible uniquement par l'assignee
      return assignee === myUserId
    })
  })()
  const totalSections = new Set(questions.map((q) => q.code.split('-')[0]))
  const hasAssignment = Object.keys(assignees).length > 0

  return (
    <div className="min-h-screen bg-[#FAFAF8] py-8 px-4">
      <div className="max-w-[640px] mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-gray-900">{templateName}</h1>
          <p className="text-[13px] text-gray-400 mt-1">Remplissez le questionnaire &eacute;tape par &eacute;tape. Vos r&eacute;ponses sont sauvegard&eacute;es automatiquement.</p>
        </div>

        {hasAssignment && assignedSections.size > 0 && assignedSections.size < totalSections.size && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg text-[12px] text-purple-700 text-center">
            Vous êtes responsable des sections : <strong>{Array.from(assignedSections).join(', ')}</strong>. Les autres sections sont gérées par d&apos;autres contacts.
          </div>
        )}

        <QuestionnaireWizard
          questions={filteredQuestions}
          instanceId={instance.id}
          userId={profile?.id ?? null}
          initialRows={responses}
          dueDate={instance.due_date ?? null}
          onComplete={() => { window.location.href = '/missions' }}
        />
      </div>
    </div>
  )
}
