import { Sparkles } from 'lucide-react'
import { useAuth } from '../../../../hooks/useAuth'
import { useFeatureFlag } from '../../../../hooks/useFeatureFlag'
import { useMissionQuestionnaire } from '../../../missions/useMissionQuestionnaire'
import { useMissionDocuments } from '../../../missions/useMissionDocuments'
import { useClientExpectedDocuments } from '../../smart-interview/useClientExpectedDocuments'
import { DeclineEvidenceModal } from '../../smart-interview/DeclineEvidenceModal'
import { SmartInterviewContainer } from '../../smart-interview/SmartInterviewContainer'
import { ACCEPT_ATTR } from '../../../missions/uploadValidation'
import { useClientEvidenceUpload } from './useClientEvidenceUpload'
import { useEvidenceDeclineFlow } from './useEvidenceDeclineFlow'
import { DocumentsSection } from './DocumentsSection'
import { InterviewsSection } from './InterviewsSection'
import type { ClientMissionDetail } from '../useClientMissionDetail'

interface Props {
  mission: ClientMissionDetail
  canContribute: boolean
  onRefetch: () => void
}

export function ClientExchangesTab({ mission, canContribute }: Props): JSX.Element {
  const { profile } = useAuth()
  const smartInterviewFlag = useFeatureFlag('smart_interview_portal')

  const { instance, questions, responses, loading: qLoading } = useMissionQuestionnaire(mission.id)
  const { documents, uploading, refetch: refetchDocs } = useMissionDocuments(mission.id)
  const {
    expectedDocs, pendingCount, uploadedCount, declinedCount, coveredControls, totalControls,
    loading: edLoading, refetch: refetchExpected,
  } = useClientExpectedDocuments(mission.id)

  const upload = useClientEvidenceUpload({ missionId: mission.id, documents, refetchDocs, refetchExpected })
  const decline = useEvidenceDeclineFlow(refetchExpected)

  const initialResponses = new Map<string, unknown>()
  for (const r of responses) {
    const val = r.response
    if (val && typeof val === 'object' && 'value' in val) {
      initialResponses.set(r.question_code, (val as { value: unknown }).value)
    }
  }

  return (
    <div className="space-y-8">
      {/* Single hidden file input */}
      <input ref={upload.fileInputRef} type="file" multiple className="hidden"
        accept={ACCEPT_ATTR}
        onChange={upload.handleFileSelected} />

      {/* ═══ SECTION: Documents ═══ */}
      <DocumentsSection
        canContribute={canContribute}
        uploading={uploading}
        documents={documents}
        expectedDocs={expectedDocs}
        edLoading={edLoading}
        pendingCount={pendingCount}
        uploadedCount={uploadedCount}
        declinedCount={declinedCount}
        coveredControls={coveredControls}
        totalControls={totalControls}
        upload={upload}
        decline={decline}
      />

      {/* ═══ SECTION: Questionnaire ═══ */}
      {!smartInterviewFlag.loading && smartInterviewFlag.enabled && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={15} className="text-gold-500" />
            <h3 className="text-sm font-bold">Questionnaire intelligent</h3>
          </div>
          {qLoading ? (
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-center"><p className="text-xs text-gray-400">Chargement...</p></div>
          ) : instance && questions.length > 0 ? (
            <SmartInterviewContainer missionId={mission.id} missionName={mission.name} questions={questions} instanceId={instance.id} userId={profile?.id ?? null} initialResponses={initialResponses} readOnly={!canContribute} documentsCount={documents.length} />
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-center"><p className="text-xs text-gray-400">Aucun questionnaire pour cette mission.</p></div>
          )}
        </section>
      )}

      {/* ═══ SECTION: Entretiens ═══ */}
      <InterviewsSection missionId={mission.id} />

      {/* Decline modal */}
      {decline.decliningDoc && (
        <DeclineEvidenceModal
          documentName={decline.decliningDoc.name}
          evidenceRequestIds={decline.decliningDoc.evidenceRequestIds}
          submitting={decline.declineSubmitting}
          error={decline.declineError}
          onClose={() => { decline.setDecliningDoc(null); decline.setDeclineError(null) }}
          onConfirm={decline.handleDecline}
        />
      )}
    </div>
  )
}
