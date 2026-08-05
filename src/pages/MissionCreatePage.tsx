import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMissionCreateForm } from '../features/missions/useMissionCreateForm'
import { MissionEngagementStep } from '../features/missions/steps/MissionEngagementStep'
import { MissionTypeStep } from '../features/missions/steps/MissionTypeStep'
import { MissionClientStep } from '../features/missions/steps/MissionClientStep'
import { MissionScopeStep } from '../features/missions/steps/MissionScopeStep'
import { MissionTeamStep } from '../features/missions/steps/MissionTeamStep'
import { MissionCalendarStep } from '../features/missions/steps/MissionCalendarStep'
import { MissionConfirmStep } from '../features/missions/steps/MissionConfirmStep'
import { QuickClientModal } from '../features/missions/QuickClientModal'
import { FormWizard } from '../components/ui/FormWizard'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { useToast } from '../hooks/useToast'

export function MissionCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const f = useMissionCreateForm()
  const [scopeTouched, setScopeTouched] = useState(false)
  const [teamTouched, setTeamTouched] = useState(false)
  const [showClientModal, setShowClientModal] = useState(false)

  if (f.loading) return <LoadingSpinner />

  const scopeError = f.scopeDomainIds.size === 0
    ? 'Sélectionnez au moins un domaine.'
    : (!f.missionName.trim() ? 'Nommez la mission.' : null)
  const associateError = !f.associateId ? 'Associé requis.' : null
  const leadError = !f.leadAuditorId ? 'Chef de mission requis.' : null

  const handleSubmit = async () => {
    const res = await f.submit()
    if (res.ok) {
      toast.success('Mission créée', {
        description: f.missionName,
        action: { label: 'Voir', onClick: () => navigate('/missions') },
      })
      navigate('/missions')
    } else {
      toast.error('Création impossible', { description: res.error })
    }
  }

  return (
    <div>
      <Link to="/missions" className="text-[13px] text-forest-700 hover:text-forest-900">
        &larr; Retour aux missions
      </Link>

      <h2 className="mt-4 text-xl font-semibold text-gray-900">Nouvelle mission</h2>
      <p className="mt-1 text-[13px] text-gray-500">Créez une mission en 7 étapes guidées.</p>

      <div className="mt-6">
        <FormWizard
          submitLabel="Créer la mission"
          submitting={f.creating}
          onSubmit={handleSubmit}
          steps={[
            {
              key: 'engagement',
              label: 'Engagement',
              content: <MissionEngagementStep kind={f.kind} onChange={f.setKind} groupAvailable={f.groupAvailable} />,
            },
            {
              key: 'type',
              label: 'Référentiel',
              validate: () => !!f.frameworkId,
              content: <MissionTypeStep frameworks={f.frameworks} selectedFrameworkId={f.frameworkId} onSelect={f.setFrameworkId} />,
            },
            {
              key: 'client',
              label: 'Client',
              validate: () => !!f.clientId,
              content: (
                <MissionClientStep
                  clients={f.clients}
                  selectedClientId={f.clientId}
                  onSelect={f.setClientId}
                  onNewClient={() => setShowClientModal(true)}
                />
              ),
            },
            {
              key: 'scope',
              label: 'Périmètre',
              validate: () => {
                setScopeTouched(true)
                return f.scopeDomainIds.size > 0 && f.missionName.trim().length > 0
              },
              content: (
                <MissionScopeStep
                  framework={f.selectedFramework}
                  domains={f.domains}
                  loading={f.domainsLoading}
                  missionName={f.missionName}
                  onMissionName={f.onMissionName}
                  selectedDomainIds={f.scopeDomainIds}
                  onToggleDomain={f.toggleDomain}
                  error={scopeTouched ? scopeError : null}
                />
              ),
            },
            {
              key: 'team',
              label: 'Équipe',
              validate: () => {
                setTeamTouched(true)
                return !!f.associateId && !!f.leadAuditorId
              },
              content: (
                <MissionTeamStep
                  members={f.members}
                  associateId={f.associateId}
                  leadAuditorId={f.leadAuditorId}
                  selectedMemberIds={f.memberIds}
                  totalControls={f.totalControls}
                  onAssociateId={f.setAssociateId}
                  onLeadAuditorId={f.setLeadAuditorId}
                  onToggleMember={f.toggleMember}
                  associateError={teamTouched ? associateError : null}
                  leadError={teamTouched ? leadError : null}
                  eligibleLeadIds={f.eligibleLeadIds}
                />
              ),
            },
            {
              key: 'calendar',
              label: 'Calendrier',
              validate: () => {
                f.startDate.forceShow()
                f.endDate.forceShow()
                return f.startDate.isValid && f.endDate.isValid
              },
              content: (
                <MissionCalendarStep
                  startDate={f.startDate.value}
                  endDate={f.endDate.value}
                  startDateError={f.startDate.error}
                  endDateError={f.endDate.error}
                  totalControls={f.totalControls}
                  teamSize={f.teamSize}
                  onStartDate={f.startDate.onChange}
                  onEndDate={f.endDate.onChange}
                  onStartBlur={f.startDate.onBlur}
                  onEndBlur={f.endDate.onBlur}
                />
              ),
            },
            {
              key: 'confirm',
              label: 'Confirmation',
              content: (
                <MissionConfirmStep
                  missionName={f.missionName}
                  framework={f.selectedFramework}
                  client={f.selectedClient}
                  associateId={f.associateId}
                  leadAuditorId={f.leadAuditorId}
                  teamSize={f.teamSize}
                  startDate={f.startDate.value}
                  endDate={f.endDate.value}
                  members={f.members}
                  totalControls={f.totalControls}
                  selectedDomains={f.scopeDomainIds.size}
                  totalDomains={f.domains.length}
                />
              ),
            },
          ]}
        />
      </div>

      <QuickClientModal
        open={showClientModal}
        onClose={() => setShowClientModal(false)}
        onCreated={(id) => {
          f.refetchClients()
          f.setClientId(id)
          setShowClientModal(false)
        }}
      />
    </div>
  )
}
