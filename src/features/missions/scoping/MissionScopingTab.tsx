import { useState, useCallback } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { useScopingData } from './useScopingData'
import { useSaveScoping } from './useSaveScoping'
import { generateScopingNotePDF } from '../../reports/generateScopingNotePDF'
import { useMissionEvidenceRequests } from '../useMissionEvidenceRequests'
import { useMissionDocuments } from '../useMissionDocuments'
import { useMissionQuestionnaire } from '../useMissionQuestionnaire'
import { ScopingClientTab } from './ScopingClientTab'
import { ScopingScopeTab } from './ScopingScopeTab'
import { ScopingQuestionnaireTab } from './ScopingQuestionnaireTab'
import { ScopingRisksTab } from './ScopingRisksTab'
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

type ScopingTab = 'client' | 'scope' | 'questionnaire' | 'risks'

export function MissionScopingTab({ mission, members, domains, client, onRefetch }: MissionScopingTabProps) {
  const { profile } = useAuth()
  const { exclusions, risks, auditHistory, loading, error, refetch: refetchScoping } = useScopingData(mission.id, client?.id)
  const { addExclusion, removeExclusion, addRisk, removeRisk, saving, error: saveError } = useSaveScoping(refetchScoping)
  const { answeredCount, totalCount } = useMissionQuestionnaire(mission.id)
  const { documents } = useMissionDocuments(mission.id)
  const { requests } = useMissionEvidenceRequests(mission.id)
  const [activeTab, setActiveTab] = useState<ScopingTab>('client')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [showPortalModal, setShowPortalModal] = useState(false)

  const questProgress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0
  const docsReceived = documents.length
  const docsExpected = requests.length || 1

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
  const handleGenerateNote = useCallback(() => {
    setActionSuccess(null)
    try {
      generateScopingNotePDF({ mission, members, domains, exclusions, risks, client, questionnaireProgress: questProgress, documentsReceived: docsReceived, documentsExpected: docsExpected })
      setActionSuccess('Note de cadrage PDF t\u00e9l\u00e9charg\u00e9e.')
    } catch (err) {
      console.error('handleGenerateNote:', err)
      setActionSuccess('Erreur lors de la g\u00e9n\u00e9ration du PDF.')
    }
  }, [mission, members, domains, exclusions, risks, client, questProgress, docsReceived, docsExpected])

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
          <div className="w-7 h-7 rounded-lg bg-purple-500 text-white flex items-center justify-center text-sm shrink-0">&#9733;</div>
          <p className="flex-1 text-xs text-purple-800"><strong>SmartScope</strong> peut analyser les documents et r&eacute;ponses pour identifier les risques cl&eacute;s.</p>
          <button className="text-xs font-semibold text-white bg-purple-500 px-3 py-1.5 rounded-lg hover:bg-purple-600 shrink-0">&#9733; Analyser</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-[#FAFAFA]">
          <TabBtn label="Fiche client" active={activeTab === 'client'} onClick={() => setActiveTab('client')} />
          <TabBtn label="P&eacute;rim&egrave;tre" count={domains.length} active={activeTab === 'scope'} onClick={() => setActiveTab('scope')} />
          <TabBtn label="Questionnaire" count={`${answeredCount}/${totalCount}`} active={activeTab === 'questionnaire'} onClick={() => setActiveTab('questionnaire')} />
          <TabBtn label="Risques" count={risks.length} active={activeTab === 'risks'} onClick={() => setActiveTab('risks')} />
        </div>

        {saveError && <div className="mx-4 mt-3"><ErrorAlert message={saveError} /></div>}

        {/* Tab content */}
        {activeTab === 'client' && <ScopingClientTab client={client} auditHistory={auditHistory} />}
        {activeTab === 'scope' && (
          <ScopingScopeTab mission={mission} domains={domains} exclusions={exclusions} client={client} onAddExclusion={handleAddExclusion} onRemoveExclusion={removeExclusion} saving={saving} />
        )}
        {activeTab === 'questionnaire' && <ScopingQuestionnaireTab mission={mission} onRefetch={onRefetch} />}
        {activeTab === 'risks' && (
          <ScopingRisksTab missionId={mission.id} risks={risks} userId={profile?.id ?? ''} onAddRisk={handleAddRisk} onRemoveRisk={removeRisk} saving={saving} error={saveError} />
        )}
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
