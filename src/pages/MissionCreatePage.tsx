import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMissionCreateForm } from '../features/missions/useMissionCreateForm'
import { MissionEngagementStep } from '../features/missions/steps/MissionEngagementStep'
import { MissionTypeStep } from '../features/missions/steps/MissionTypeStep'
import { MissionClientStep } from '../features/missions/steps/MissionClientStep'
import { MissionSubsidiaryStep } from '../features/missions/steps/MissionSubsidiaryStep'
import { MissionScopeStep } from '../features/missions/steps/MissionScopeStep'
import { MissionTeamStep } from '../features/missions/steps/MissionTeamStep'
import { MissionCalendarStep } from '../features/missions/steps/MissionCalendarStep'
import { MissionConfirmStep } from '../features/missions/steps/MissionConfirmStep'
import { QuickClientModal } from '../features/missions/QuickClientModal'
import { FormWizard, type WizardStep } from '../components/ui/FormWizard'
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

  const scopeError = f.scopeControlIds.size === 0
    ? 'Sélectionnez au moins un contrôle.'
    : (!f.missionName.trim() ? 'Nommez la mission.' : null)
  // Séparation des devoirs : l'associé (validateur ultime) et le chef doivent être
  // deux personnes distinctes (le serveur le refuse aussi — cf. create-mission).
  const sameError = f.associateId && f.leadAuditorId && f.associateId === f.leadAuditorId
    ? 'L’associé et le chef de mission doivent être deux personnes différentes.'
    : null
  const associateError = !f.associateId ? 'Associé requis.' : sameError
  const leadError = !f.leadAuditorId ? 'Chef de mission requis.' : sameError

  const targetLabel = f.isSupervision ? 'Filiale' : 'Client'
  const targetValue = f.isSupervision
    ? (f.selectedSubsidiary ? [f.selectedSubsidiary.name, f.selectedSubsidiary.sector].filter(Boolean).join(' · ') : '—')
    : (f.selectedClient ? `${f.selectedClient.client_name}${f.selectedClient.client_sector ? ` · ${f.selectedClient.client_sector}` : ''}` : '—')

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

  const steps: WizardStep[] = []

  // Engagement : uniquement pour les groupes (sinon audit par défaut, étape masquée).
  if (f.groupAvailable) {
    steps.push({
      key: 'engagement',
      label: 'Engagement',
      content: <MissionEngagementStep kind={f.kind} onChange={f.setKind} groupAvailable={f.groupAvailable} />,
    })
  }

  steps.push({
    key: 'type',
    label: 'Référentiel',
    validate: () => !!f.frameworkId,
    content: <MissionTypeStep frameworks={f.frameworks} selectedFrameworkId={f.frameworkId} onSelect={f.setFrameworkId} />,
  })

  // Cible : filiale (supervision continue) ou client (audit).
  steps.push({
    key: 'target',
    label: targetLabel,
    validate: () => f.targetSelected,
    content: f.isSupervision ? (
      <MissionSubsidiaryStep
        subsidiaries={f.subsidiaries}
        loading={f.subsLoading}
        selectedSubsidiaryId={f.subsidiaryId}
        onSelect={f.setSubsidiaryId}
      />
    ) : (
      <MissionClientStep
        clients={f.clients}
        selectedClientId={f.clientId}
        onSelect={f.setClientId}
        onNewClient={() => setShowClientModal(true)}
      />
    ),
  })

  steps.push({
    key: 'scope',
    label: 'Périmètre',
    validate: () => {
      setScopeTouched(true)
      return f.scopeControlIds.size > 0 && f.missionName.trim().length > 0
    },
    content: (
      <MissionScopeStep
        framework={f.selectedFramework}
        domains={f.domains}
        loading={f.domainsLoading}
        missionName={f.missionName}
        onMissionName={f.onMissionName}
        selectedControlIds={f.scopeControlIds}
        onToggleControl={f.toggleControl}
        onToggleDomain={f.toggleDomain}
        error={scopeTouched ? scopeError : null}
      />
    ),
  })

  steps.push({
    key: 'team',
    label: 'Équipe',
    validate: () => {
      setTeamTouched(true)
      return !!f.associateId && !!f.leadAuditorId && f.associateId !== f.leadAuditorId
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
  })

  steps.push({
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
  })

  steps.push({
    key: 'confirm',
    label: 'Confirmation',
    content: (
      <MissionConfirmStep
        missionName={f.missionName}
        framework={f.selectedFramework}
        targetLabel={targetLabel}
        targetValue={targetValue}
        associateId={f.associateId}
        leadAuditorId={f.leadAuditorId}
        teamSize={f.teamSize}
        startDate={f.startDate.value}
        endDate={f.endDate.value}
        members={f.members}
        totalControls={f.totalControls}
        selectedDomains={f.selectedDomains}
        totalDomains={f.domains.length}
      />
    ),
  })

  return (
    <div>
      <Link to="/missions" className="text-[13px] text-forest-700 hover:text-forest-900">
        &larr; Retour aux missions
      </Link>

      <h2 className="mt-4 text-xl font-semibold text-gray-900">Nouvelle mission</h2>
      <p className="mt-1 text-[13px] text-gray-500">Créez une mission en {steps.length} étapes guidées.</p>

      <div className="mt-6">
        <FormWizard submitLabel="Créer la mission" submitting={f.creating} onSubmit={handleSubmit} steps={steps} />
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
