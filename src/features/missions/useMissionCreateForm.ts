import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { isGroupOrg } from '../../lib/organization-utils'
import { useFrameworks } from '../frameworks/useFrameworks'
import { useCabinetClients } from '../clients/useCabinetClients'
import { useMembers } from '../members/useMembers'
import { useFrameworkDomains } from './useFrameworkDomains'
import { useCreateMission } from './useCreateMission'
import { useFieldValidation, required } from '../../hooks/useFieldValidation'
import type { MissionKind } from '../../types/database.types'

/**
 * État + logique du wizard de création de mission (Comply). Extrait de la page
 * pour garder le composant < 150 lignes (CLAUDE.md §2) et isoler la logique.
 */
export function useMissionCreateForm() {
  const { profile } = useAuth()
  const { frameworks, loading: fwLoading } = useFrameworks()
  const { clients, loading: clientsLoading, refetch: refetchClients } = useCabinetClients()
  const { members, loading: membersLoading } = useMembers()
  const { createMission, creating } = useCreateMission()

  const [kind, setKind] = useState<MissionKind>('audit')
  const [groupAvailable, setGroupAvailable] = useState(false)
  const [frameworkId, setFrameworkId] = useState('')
  const [clientId, setClientId] = useState('')
  const [missionName, setMissionName] = useState('')
  const [nameDirty, setNameDirty] = useState(false)
  const [associateId, setAssociateId] = useState('')
  const [leadAuditorId, setLeadAuditorId] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [scopeDomainIds, setScopeDomainIds] = useState<Set<string>>(new Set())

  const startDate = useFieldValidation('', required('Date de début requise.'))
  const endDate = useFieldValidation('', (v) => {
    if (!v) return 'Date de fin requise.'
    if (startDate.value && v < startDate.value) return 'La date de fin doit être postérieure à la date de début.'
    return null
  })

  const { domains, loading: domainsLoading } = useFrameworkDomains(frameworkId || undefined)

  // Org de type groupe -> autorise la supervision continue.
  useEffect(() => {
    if (!profile?.organization_id) return
    const ac = new AbortController()
    supabase
      .from('organizations')
      .select('types')
      .eq('id', profile.organization_id)
      .abortSignal(ac.signal)
      .single()
      .then(({ data }) => {
        if (ac.signal.aborted) return
        if (data?.types && isGroupOrg({ types: data.types as string[] })) setGroupAvailable(true)
      })
    return () => ac.abort()
  }, [profile?.organization_id])

  const selectedFramework = useMemo(() => frameworks.find((f) => f.id === frameworkId) ?? null, [frameworks, frameworkId])
  const selectedClient = useMemo(() => clients.find((c) => c.id === clientId) ?? null, [clients, clientId])

  // Par défaut, tout le référentiel est retenu (aucune exclusion) -> iso-comportement
  // avec l'ancien flux tant que l'utilisateur ne désélectionne rien.
  useEffect(() => {
    setScopeDomainIds(new Set(domains.map((d) => d.id)))
  }, [domains])

  // Nom auto « Référentiel — Client », tant que l'utilisateur ne l'a pas édité.
  useEffect(() => {
    if (nameDirty) return
    if (selectedFramework && selectedClient) {
      setMissionName(`${selectedFramework.name} — ${selectedClient.client_name}`)
    }
  }, [selectedFramework, selectedClient, nameDirty])

  const onMissionName = useCallback((v: string) => { setNameDirty(true); setMissionName(v) }, [])

  const toggleDomain = useCallback((domainId: string) => {
    setScopeDomainIds((prev) => {
      const next = new Set(prev)
      if (next.has(domainId)) next.delete(domainId)
      else next.add(domainId)
      return next
    })
  }, [])

  const toggleMember = useCallback((id: string) => {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))
  }, [])

  const allMemberIds = useMemo(
    () => [...new Set([associateId, leadAuditorId, ...memberIds].filter(Boolean))],
    [associateId, leadAuditorId, memberIds],
  )
  const teamSize = allMemberIds.length
  const totalControls = useMemo(
    () => domains.reduce((sum, d) => (scopeDomainIds.has(d.id) ? sum + d.controls.length : sum), 0),
    [domains, scopeDomainIds],
  )
  // Membres habilités chef de mission (mirror du garde-fou serveur can_be_lead).
  const eligibleLeadIds = useMemo(
    () => new Set(members.filter((m) => (m.roles ?? []).some((r) => r.permissions?.can_be_lead)).map((m) => m.id)),
    [members],
  )

  const loading = fwLoading || clientsLoading || membersLoading

  const submit = useCallback(
    () =>
      createMission({
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
        scope_domain_ids: [...scopeDomainIds],
      }),
    [missionName, clientId, frameworkId, leadAuditorId, associateId, startDate.value, endDate.value, allMemberIds, kind, scopeDomainIds, createMission],
  )

  return {
    frameworks, clients, members, domains, domainsLoading, loading, creating, refetchClients,
    kind, setKind, groupAvailable, frameworkId, setFrameworkId, clientId, setClientId,
    missionName, onMissionName, associateId, setAssociateId, leadAuditorId, setLeadAuditorId,
    memberIds, toggleMember, scopeDomainIds, toggleDomain, startDate, endDate,
    selectedFramework, selectedClient, allMemberIds, teamSize, totalControls, eligibleLeadIds, submit,
  }
}
