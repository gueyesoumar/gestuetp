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
  const [scopeControlIds, setScopeControlIds] = useState<Set<string>>(new Set())

  const startDate = useFieldValidation('', required('Date de début requise.'))
  const endDate = useFieldValidation('', (v) => {
    if (!v) return 'Date de fin requise.'
    if (startDate.value && v < startDate.value) return 'La date de fin doit être postérieure à la date de début.'
    return null
  })

  const { domains, loading: domainsLoading } = useFrameworkDomains(frameworkId || undefined)

  // Spinner UNIQUEMENT au premier chargement : un refetch ultérieur (ex. après
  // création d'un client inline) ne doit pas démonter le wizard (sinon retour étape 1).
  const [everLoaded, setEverLoaded] = useState(false)
  useEffect(() => {
    if (!fwLoading && !clientsLoading && !membersLoading) setEverLoaded(true)
  }, [fwLoading, clientsLoading, membersLoading])
  const loading = !everLoaded

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

  const allControlIds = useMemo(() => domains.flatMap((d) => d.controls.map((c) => c.id)), [domains])
  const totalFrameworkControls = allControlIds.length

  // Par défaut, tous les contrôles du référentiel sont retenus (aucune exclusion)
  // -> iso-comportement tant que l'utilisateur ne désélectionne rien.
  useEffect(() => {
    setScopeControlIds(new Set(allControlIds))
  }, [allControlIds])

  // Nom auto « Référentiel — Client », tant que l'utilisateur ne l'a pas édité.
  useEffect(() => {
    if (nameDirty) return
    if (selectedFramework && selectedClient) {
      setMissionName(`${selectedFramework.name} — ${selectedClient.client_name}`)
    }
  }, [selectedFramework, selectedClient, nameDirty])

  const onMissionName = useCallback((v: string) => { setNameDirty(true); setMissionName(v) }, [])

  const toggleControl = useCallback((controlId: string) => {
    setScopeControlIds((prev) => {
      const next = new Set(prev)
      if (next.has(controlId)) next.delete(controlId)
      else next.add(controlId)
      return next
    })
  }, [])

  // Coche/décoche tous les contrôles d'un domaine : si tous retenus -> tout retirer, sinon tout ajouter.
  const toggleDomain = useCallback((domainId: string) => {
    const domain = domains.find((d) => d.id === domainId)
    if (!domain) return
    const ids = domain.controls.map((c) => c.id)
    setScopeControlIds((prev) => {
      const next = new Set(prev)
      const allIn = ids.every((id) => next.has(id))
      if (allIn) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }, [domains])

  const toggleMember = useCallback((id: string) => {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))
  }, [])

  const allMemberIds = useMemo(
    () => [...new Set([associateId, leadAuditorId, ...memberIds].filter(Boolean))],
    [associateId, leadAuditorId, memberIds],
  )
  const teamSize = allMemberIds.length
  const totalControls = scopeControlIds.size
  const selectedDomains = useMemo(
    () => domains.filter((d) => d.controls.some((c) => scopeControlIds.has(c.id))).length,
    [domains, scopeControlIds],
  )
  // Membres habilités chef de mission (mirror du garde-fou serveur can_be_lead).
  const eligibleLeadIds = useMemo(
    () => new Set(members.filter((m) => (m.roles ?? []).some((r) => r.permissions?.can_be_lead)).map((m) => m.id)),
    [members],
  )

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
        scope_control_ids: [...scopeControlIds],
      }),
    [missionName, clientId, frameworkId, leadAuditorId, associateId, startDate.value, endDate.value, allMemberIds, kind, scopeControlIds, createMission],
  )

  return {
    frameworks, clients, members, domains, domainsLoading, loading, creating, refetchClients,
    kind, setKind, groupAvailable, frameworkId, setFrameworkId, clientId, setClientId,
    missionName, onMissionName, associateId, setAssociateId, leadAuditorId, setLeadAuditorId,
    memberIds, toggleMember, scopeControlIds, toggleControl, toggleDomain, startDate, endDate,
    selectedFramework, selectedClient, allMemberIds, teamSize, totalControls, totalFrameworkControls,
    selectedDomains, eligibleLeadIds, submit,
  }
}
