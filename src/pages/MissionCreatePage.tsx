import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { isGroupOrg } from '../lib/organization-utils'
import { useFrameworks } from '../features/frameworks/useFrameworks'
import { useCabinetClients } from '../features/clients/useCabinetClients'
import { useMembers } from '../features/members/useMembers'
import { useCreateMission } from '../features/missions/useCreateMission'
import { MissionEngagementStep } from '../features/missions/steps/MissionEngagementStep'
import { MissionTypeStep } from '../features/missions/steps/MissionTypeStep'
import { MissionClientStep } from '../features/missions/steps/MissionClientStep'
import { MissionTeamStep } from '../features/missions/steps/MissionTeamStep'
import { MissionCalendarStep } from '../features/missions/steps/MissionCalendarStep'
import { MissionConfirmStep } from '../features/missions/steps/MissionConfirmStep'
import { FormWizard } from '../components/ui/FormWizard'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { useToast } from '../hooks/useToast'
import { useFieldValidation, required } from '../hooks/useFieldValidation'
import type { MissionKind } from '../types/database.types'

export function MissionCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useAuth()
  const { frameworks, loading: fwLoading } = useFrameworks()
  const { clients, loading: clientsLoading } = useCabinetClients()
  const { members, loading: membersLoading } = useMembers()
  const { createMission, creating } = useCreateMission()

  const [kind, setKind] = useState<MissionKind>('audit')
  const [groupAvailable, setGroupAvailable] = useState(false)
  const [frameworkId, setFrameworkId] = useState('')
  const [clientId, setClientId] = useState('')
  const [missionName, setMissionName] = useState('')
  const [associateId, setAssociateId] = useState('')
  const [leadAuditorId, setLeadAuditorId] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])

  useEffect(() => {
    if (!profile?.organization_id) return
    const ac = new AbortController()
    supabase
      .from('organizations')
      .select('types')
      .eq('id', profile.organization_id)
      .single()
      .abortSignal(ac.signal)
      .then(({ data }) => {
        if (ac.signal.aborted) return
        if (data?.types && isGroupOrg({ types: data.types as string[] })) {
          setGroupAvailable(true)
        }
      })
    return () => ac.abort()
  }, [profile?.organization_id])
  const startDate = useFieldValidation('', required('Date de début requise.'))
  const endDate = useFieldValidation('', (v) => {
    if (!v) return 'Date de fin requise.'
    if (startDate.value && v < startDate.value) return 'La date de fin doit être postérieure à la date de début.'
    return null
  })

  const loading = fwLoading || clientsLoading || membersLoading
  if (loading) return <LoadingSpinner />

  const selectedFramework = frameworks.find((f) => f.id === frameworkId) ?? null
  const selectedClient = clients.find((c) => c.id === clientId) ?? null
  const allMemberIds = [...new Set([associateId, leadAuditorId, ...memberIds].filter(Boolean))]
  const teamSize = allMemberIds.length

  // Auto-generate mission name
  if (selectedFramework && selectedClient && !missionName) {
    setMissionName(`${selectedFramework.name} \u2014 ${selectedClient.client_name}`)
  }

  const handleToggleMember = (id: string) => {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    const res = await createMission({
      name: missionName,
      description: '',
      cabinet_client_id: clientId,
      framework_id: frameworkId,
      lead_auditor_id: leadAuditorId,
      associate_id: associateId,
      start_date: startDate.value,
      end_date: endDate.value,
      member_ids: allMemberIds,
      kind,
    })
    if (res.ok) {
      toast.success('Mission créée', {
        description: missionName,
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
      <p className="mt-1 text-[13px] text-gray-500">Cr&eacute;ez une mission en 6 &eacute;tapes guid&eacute;es.</p>

      <div className="mt-6">
        <FormWizard
          submitLabel="Cr&eacute;er la mission"
          submitting={creating}
          onSubmit={handleSubmit}
          steps={[
            {
              key: 'engagement',
              label: "Type d'engagement",
              content: (
                <MissionEngagementStep
                  kind={kind}
                  onChange={setKind}
                  groupAvailable={groupAvailable}
                />
              ),
            },
            {
              key: 'type',
              label: 'Référentiel',
              content: (
                <MissionTypeStep
                  frameworks={frameworks}
                  selectedFrameworkId={frameworkId}
                  onSelect={setFrameworkId}
                />
              ),
            },
            {
              key: 'client',
              label: 'Client',
              content: (
                <MissionClientStep
                  clients={clients}
                  selectedClientId={clientId}
                  onSelect={setClientId}
                  onNewClient={() => navigate('/clients/nouveau')}
                />
              ),
            },
            {
              key: 'team',
              label: '\u00c9quipe',
              content: (
                <MissionTeamStep
                  members={members}
                  associateId={associateId}
                  leadAuditorId={leadAuditorId}
                  selectedMemberIds={memberIds}
                  totalControls={0}
                  onAssociateId={setAssociateId}
                  onLeadAuditorId={setLeadAuditorId}
                  onToggleMember={handleToggleMember}
                />
              ),
            },
            {
              key: 'calendar',
              label: 'Calendrier',
              validate: () => {
                startDate.forceShow()
                endDate.forceShow()
                return startDate.isValid && endDate.isValid
              },
              content: (
                <MissionCalendarStep
                  startDate={startDate.value}
                  endDate={endDate.value}
                  startDateError={startDate.error}
                  endDateError={endDate.error}
                  totalControls={0}
                  teamSize={teamSize}
                  onStartDate={startDate.onChange}
                  onEndDate={endDate.onChange}
                  onStartBlur={startDate.onBlur}
                  onEndBlur={endDate.onBlur}
                />
              ),
            },
            {
              key: 'confirm',
              label: 'Confirmation',
              content: (
                <MissionConfirmStep
                  missionName={missionName}
                  framework={selectedFramework}
                  client={selectedClient}
                  associateId={associateId}
                  leadAuditorId={leadAuditorId}
                  teamSize={teamSize}
                  startDate={startDate.value}
                  endDate={endDate.value}
                  members={members}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
