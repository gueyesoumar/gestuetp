import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { QuestionnairePreview } from './QuestionnairePreview'
import { QuestionnaireResponseTracker } from './QuestionnaireResponseTracker'
import { EvidenceRequestSection } from './EvidenceRequestSection'
import { useMissionQuestionnaire } from './useMissionQuestionnaire'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import type { MissionDetail } from './useMissionDetail'
import type { DomainWithControls } from '../frameworks/useFrameworkDetail'

interface MissionScopingTabProps {
  mission: MissionDetail
  domains: DomainWithControls[]
  hasQuestionnaire: boolean
  onRefetch: () => void
}

export function MissionScopingTab({ mission, domains, hasQuestionnaire, onRefetch }: MissionScopingTabProps) {
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const { instance, responses, questions, loading: qLoading, refetch: qRefetch, answeredCount, totalCount } = useMissionQuestionnaire(mission.id)

  // Charger l'apercu depuis le template (avant envoi)
  const [previewQuestions, setPreviewQuestions] = useState<{ name: string; questions: { id: string; code: string; text: string; description: string | null; question_type: string; options: string[] | null; is_required: boolean; sort_order: number }[] } | null>(null)

  const handleShowPreview = async () => {
    if (previewQuestions) {
      setShowPreview(!showPreview)
      return
    }
    const { data: templates } = await supabase
      .from('questionnaire_templates')
      .select('id, name')
      .eq('framework_id', mission.framework?.id ?? '')
      .eq('is_active', true)
      .limit(1)

    if (!templates || templates.length === 0) return

    const { data: qs } = await supabase
      .from('questions')
      .select('*')
      .eq('template_id', templates[0].id)
      .order('sort_order')

    setPreviewQuestions({ name: templates[0].name, questions: qs ?? [] })
    setShowPreview(true)
  }

  const handleLaunch = async () => {
    setLaunching(true)
    setLaunchError(null)

    const { data, error: fnError } = await supabase.functions.invoke('launch-questionnaire', {
      body: { mission_id: mission.id },
    })

    if (fnError) {
      let detail = fnError.message
      try {
        const context = (fnError as unknown as { context: { json: () => Promise<{ error?: string }> } }).context
        if (context?.json) {
          const body = await context.json()
          if (body?.error) detail = body.error
        }
      } catch { /* */ }
      setLaunchError(detail)
      setLaunching(false)
      return
    }

    if (data?.error) {
      setLaunchError(data.error)
      setLaunching(false)
      return
    }

    setLaunching(false)
    onRefetch()
    qRefetch()
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Cadrage &amp; collecte initiale</h3>
        <p className="mt-1 text-sm text-gray-600">
          Questionnaire de prise de connaissance, collecte documentaire et suivi des r&eacute;ponses.
        </p>
      </div>

      {launchError && <ErrorAlert message={launchError} />}

      {/* Section questionnaire */}
      {hasQuestionnaire || instance ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">
              &#10003; Questionnaire envoy&eacute; au client.
            </p>
          </div>
          {qLoading ? (
            <LoadingSpinner message="Chargement des r&eacute;ponses..." />
          ) : (
            <QuestionnaireResponseTracker
              questions={questions}
              responses={responses}
              answeredCount={answeredCount}
              totalCount={totalCount}
            />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLaunch}
              disabled={launching}
              className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-forest-900 disabled:opacity-50"
            >
              {launching ? 'Envoi en cours...' : 'Envoyer le questionnaire'}
            </button>
            <button
              onClick={handleShowPreview}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-[13px] text-gray-600 hover:bg-forest-50 hover:border-forest-300 transition-colors"
            >
              {showPreview ? 'Masquer l\u2019aper\u00e7u' : 'Voir l\u2019aper\u00e7u'}
            </button>
          </div>
          {showPreview && previewQuestions && (
            <QuestionnairePreview
              templateName={previewQuestions.name}
              questions={previewQuestions.questions as import('../../types/database.types').Question[]}
            />
          )}
        </div>
      )}

      {/* Section preuves */}
      <EvidenceRequestSection
        missionId={mission.id}
        domains={domains}
      />
    </div>
  )
}
