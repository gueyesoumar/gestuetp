import { useState, useCallback, useEffect } from 'react'
import { Star } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { useScopingData } from './useScopingData'
import { useSaveScoping } from './useSaveScoping'
import { generateScopingNotePDF } from '../../reports/generateScopingNotePDF'
import { useReviewLabels } from '../../organization-settings/useReviewLabels'
import { useMissionEvidenceRequests } from '../useMissionEvidenceRequests'
import { useMissionDocuments } from '../useMissionDocuments'
import { useMissionQuestionnaire } from '../useMissionQuestionnaire'
import { ScopingScopeTab } from './ScopingScopeTab'
import { ScopingQuestionnaireTab } from './ScopingQuestionnaireTab'
import { ScopingDocumentsTab } from './ScopingDocumentsTab'
import { ScopingRisksTab } from './ScopingRisksTab'
import { ScopingActorsTab } from './ScopingActorsTab'
import { useMissionActors } from './useMissionActors'
import { ScopingProgressSidebar } from './ScopingProgressSidebar'
import { PortalInviteModal } from './PortalInviteModal'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import type { MissionDetail, MissionMemberRow } from '../useMissionDetail'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { CabinetClient } from '../../../types/database.types'

interface MissionScopingTabProps {
  mission: MissionDetail
  members: MissionMemberRow[]
  domains: DomainWithControls[]
  client: CabinetClient | null
  onRefetch: () => void
}

type ScopingTab = 'scope' | 'questionnaire' | 'documents' | 'risks' | 'actors'

export function MissionScopingTab({ mission, members, domains, client, onRefetch }: MissionScopingTabProps) {
  const { profile } = useAuth()
  const { lead, associate } = useReviewLabels()
  const { exclusions, risks, loading, error, refetch: refetchScoping } = useScopingData(mission.id)
  const { addExclusion, removeExclusion, addRisk, removeRisk, saving, error: saveError } = useSaveScoping(refetchScoping)
  const { answeredCount, totalCount } = useMissionQuestionnaire(mission.id)
  const { documents } = useMissionDocuments(mission.id)
  const { requests } = useMissionEvidenceRequests(mission.id)
  const { actors } = useMissionActors(mission.id)
  const [activeTab, setActiveTab] = useState<ScopingTab>('scope')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [showPortalModal, setShowPortalModal] = useState(false)

  const questProgress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0

  // Compute documents received vs expected based on mission_evidence_requests
  // - docsExpected: number of unique evidence names requested by the auditor
  // - docsReceived: number of those evidence names that have at least one matching document
  //   (matched via [EVIDENCE:name] tag in document.description)
  const [docsExpected, setDocsExpected] = useState(0)
  const [docsReceived, setDocsReceived] = useState(0)

  useEffect(() => {
    if (requests.length === 0) {
      setDocsExpected(0)
      setDocsReceived(0)
      return
    }

    const controller = new AbortController()
    const fetchEvidenceNames = async (): Promise<void> => {
      const catalogIds = requests.map((r) => r.evidence_catalog_id)
      const { data: catalogItems } = await supabase
        .from('evidence_catalog')
        .select('name')
        .in('id', catalogIds)
        .abortSignal(controller.signal)

      if (controller.signal.aborted) return

      const expectedNames = new Set((catalogItems ?? []).map((c) => c.name))
      const uploadedNames = new Set<string>()
      for (const doc of documents) {
        const match = doc.description?.match(/\[EVIDENCE:(.+?)\]/)
        if (match && expectedNames.has(match[1])) uploadedNames.add(match[1])
      }

      setDocsExpected(expectedNames.size)
      setDocsReceived(uploadedNames.size)
    }

    fetchEvidenceNames()
    return () => controller.abort()
  }, [requests, documents])

  const handleAddExclusion = useCallback((controlId: string, reason: string) => {
    addExclusion({ mission_id: mission.id, control_id: controlId, reason })
  }, [mission.id, addExclusion])

  const handleAddRisk = useCallback(async (data: { mission_id: string; title: string; risk_level: 'critical' | 'high' | 'medium' | 'low'; description: string; source: string; created_by: string }) => {
    return addRisk(data)
  }, [addRisk])

  // === ACTION 1: Relancer le client ===
  const handleRemindClient = useCallback(async () => {
    setActionLoading(true)
    setActionSuccess(null)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = { 'Content-Type': 'application/json', 'apikey': apikey, 'Authorization': `Bearer ${token}` }

      // Trouver les utilisateurs de l'organisation client
      const usersRes = await fetch(`${baseUrl}/rest/v1/users?organization_id=eq.${mission.client_id}&is_active=eq.true&select=id`, { headers })
      const clientUsers: { id: string }[] = usersRes.ok ? await usersRes.json() : []

      if (clientUsers.length === 0) {
        setActionSuccess('Aucun utilisateur client trouv\u00e9. V\u00e9rifiez que le client a des utilisateurs actifs.')
        setActionLoading(false)
        return
      }

      const pendingDocs = requests.filter((r) => r.status === 'pending').length
      const questPending = totalCount - answeredCount

      const notifications = clientUsers.map((u) => ({
        user_id: u.id,
        type: 'invitation',
        title: `Rappel : Mission ${mission.name}`,
        body: [
          questPending > 0 ? `${questPending} question${questPending > 1 ? 's' : ''} du questionnaire en attente` : null,
          pendingDocs > 0 ? `${pendingDocs} document${pendingDocs > 1 ? 's' : ''} en attente` : null,
        ].filter(Boolean).join('. ') || 'Merci de compl\u00e9ter les \u00e9l\u00e9ments de cadrage.',
        link: `/missions/${mission.id}`,
        metadata: { mission_id: mission.id },
      }))

      const notifRes = await fetch(`${baseUrl}/rest/v1/notifications`, {
        method: 'POST', headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify(notifications),
      })

      if (!notifRes.ok) {
        console.error('handleRemindClient:', await notifRes.text())
        setActionSuccess('Erreur lors de l\u2019envoi de la relance.')
      } else {
        setActionSuccess(`Relance envoy\u00e9e \u00e0 ${clientUsers.length} utilisateur${clientUsers.length > 1 ? 's' : ''} client.`)
      }
    } catch (err) {
      console.error('handleRemindClient:', err)
      setActionSuccess('Erreur inattendue.')
    }
    setActionLoading(false)
  }, [mission, requests, totalCount, answeredCount])

  // === ACTION 2: Generer la note de cadrage (PDF) ===
  const handleGenerateNote = useCallback(async () => {
    setActionSuccess(null)
    try {
      await generateScopingNotePDF({ mission, members, domains, exclusions, risks, client, questionnaireProgress: questProgress, documentsReceived: docsReceived, documentsExpected: docsExpected, reviewLabels: { lead, associate } })
      setActionSuccess('Note de cadrage PDF t\u00e9l\u00e9charg\u00e9e.')
    } catch (err) {
      console.error('handleGenerateNote:', err)
      setActionSuccess('Erreur lors de la g\u00e9n\u00e9ration du PDF.')
    }
  }, [mission, members, domains, exclusions, risks, client, questProgress, docsReceived, docsExpected, lead, associate])

  // === ACTION 3: Valider le cadrage ===
  const handleValidateScoping = useCallback(async () => {
    setActionLoading(true)
    setActionSuccess(null)

    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/missions?id=eq.${mission.id}`
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ status: 'planning' }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('handleValidateScoping:', res.status, text)
      setActionSuccess('Erreur lors de la validation du cadrage.')
    } else {
      setActionSuccess('Cadrage valid\u00e9. La mission passe en phase Planification.')
      onRefetch()
    }
    setActionLoading(false)
  }, [mission.id, onRefetch])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  return (
    <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white" style={{ minHeight: '660px' }}>
      {/* LEFT PANEL */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200">
        {/* AI banner */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-purple-50 border-b border-purple-200">
          <div className="w-7 h-7 rounded-lg bg-purple-500 text-white flex items-center justify-center shrink-0"><Star size={14} /></div>
          <p className="flex-1 text-xs text-purple-800"><strong>SmartScope</strong> peut analyser les documents et r&eacute;ponses pour identifier les risques cl&eacute;s.</p>
          <button className="text-xs font-semibold text-white bg-purple-500 px-3 py-1.5 rounded-lg hover:bg-purple-600 shrink-0 flex items-center gap-1"><Star size={12} /> Analyser</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-[#FAFAFA]">
          <TabBtn label="P&eacute;rim&egrave;tre" count={domains.length} active={activeTab === 'scope'} onClick={() => setActiveTab('scope')} />
          <TabBtn label="Questionnaire" count={`${answeredCount}/${totalCount}`} active={activeTab === 'questionnaire'} onClick={() => setActiveTab('questionnaire')} />
          <TabBtn label="Documents" count={docsExpected > 0 ? `${docsReceived}/${docsExpected}` : undefined} active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} />
          <TabBtn label="Risques" count={risks.length} active={activeTab === 'risks'} onClick={() => setActiveTab('risks')} />
          <TabBtn label="Acteurs" count={actors.length} active={activeTab === 'actors'} onClick={() => setActiveTab('actors')} />
        </div>

        {saveError && <div className="mx-4 mt-3"><ErrorAlert message={saveError} /></div>}

        {/* Tab content */}
        {activeTab === 'scope' && (
          <ScopingScopeTab mission={mission} domains={domains} exclusions={exclusions} client={client} onAddExclusion={handleAddExclusion} onRemoveExclusion={removeExclusion} saving={saving} />
        )}
        {activeTab === 'questionnaire' && <ScopingQuestionnaireTab mission={mission} onRefetch={onRefetch} />}
        {activeTab === 'documents' && (
          <div className="flex-1 overflow-y-auto p-4">
            <ScopingDocumentsTab missionId={mission.id} domains={domains} exclusions={exclusions} />
          </div>
        )}
        {activeTab === 'risks' && (
          <ScopingRisksTab missionId={mission.id} risks={risks} userId={profile?.id ?? ''} onAddRisk={handleAddRisk} onRemoveRisk={removeRisk} saving={saving} error={saveError} />
        )}
        {activeTab === 'actors' && <ScopingActorsTab missionId={mission.id} />}
      </div>

      {/* RIGHT SIDEBAR */}
      <div className="w-[360px] shrink-0">
        <ScopingProgressSidebar
          mission={mission}
          members={members}
          client={client}
          exclusions={exclusions}
          risks={risks}
          questionnaireProgress={questProgress}
          documentsReceived={docsReceived}
          documentsExpected={docsExpected}
          onRemindClient={handleRemindClient}
          onGenerateNote={handleGenerateNote}
          onValidateScoping={handleValidateScoping}
          onInvitePortal={() => setShowPortalModal(true)}
          onNavigate={(tab) => setActiveTab(tab)}
          actionLoading={actionLoading}
          actionSuccess={actionSuccess}
        />
      </div>

      {/* Portal invite modal */}
      {showPortalModal && client && (
        <PortalInviteModal
          missionId={mission.id}
          cabinetClientId={client.id}
          onClose={() => setShowPortalModal(false)}
          onSuccess={() => setActionSuccess('Invitation envoy\u00e9e avec succ\u00e8s.')}
        />
      )}
    </div>
  )
}

function TabBtn({ label, count, active, onClick }: { label: string; count?: number | string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-5 py-3 text-xs font-medium relative whitespace-nowrap ${active ? 'text-forest-700 font-semibold' : 'text-gray-500 hover:text-forest-700'}`}>
      {label}
      {count !== undefined && (
        <span className={`ml-1 text-[10px] font-semibold px-1.5 rounded-full ${active ? 'bg-forest-100 text-forest-700' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
      )}
      {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-forest-700" />}
    </button>
  )
}
