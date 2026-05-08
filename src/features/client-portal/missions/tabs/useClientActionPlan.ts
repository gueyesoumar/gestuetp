import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useToast } from '../../../../hooks/useToast'
import { generateActionPlanXLSX, type ActionPlanCAR } from '../../../reports/generateActionPlanXLSX'
import type { ClientMissionDetail } from '../useClientMissionDetail'
import type { AssessmentFinding } from '../../../../types/database.types'

interface ClientContact {
  id: string
  contact_name: string | null
  email: string
}

interface BrandColors {
  primary: string
  accent: string
}

const DEFAULT_BRAND: BrandColors = { primary: '#1B4332', accent: '#D4A843' }

interface UseClientActionPlanResult {
  cars: ActionPlanCAR[]
  loading: boolean
  busy: boolean
  contacts: ClientContact[]
  userNames: Map<string, string>
  contactNames: Map<string, string>
  reload: () => Promise<void>
  exportXLSX: () => Promise<void>
  submitResponse: (carId: string, payload: SubmitPayload) => Promise<boolean>
}

interface SubmitPayload {
  rootCause: string
  action: string
  targetDate: string
  responsibleId: string | null
}

export function useClientActionPlan(mission: ClientMissionDetail): UseClientActionPlanResult {
  const toast = useToast()
  const [cars, setCars] = useState<ActionPlanCAR[]>([])
  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map())
  const [contactNames, setContactNames] = useState<Map<string, string>>(new Map())
  const [brand, setBrand] = useState<BrandColors>(DEFAULT_BRAND)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (signal?: AbortSignal): Promise<void> => {
    // 1. CAR de la mission (RLS filtre déjà côté client)
    const { data: carRows, error: carErr } = await supabase
      .from('corrective_action_requests')
      .select('*')
      .eq('mission_id', mission.id)
      .order('code', { ascending: true })
    if (signal?.aborted) return
    if (carErr) {
      console.error('useClientActionPlan cars:', carErr.message)
      setLoading(false)
      return
    }

    // 2. Domaines + contrôles (pour mapper control_id → domain_name)
    const { data: domainRows } = await supabase
      .from('domains')
      .select('id, name, controls(id)')
      .eq('framework_id', mission.framework_id)
    if (signal?.aborted) return
    const domainByControl = new Map<string, string>()
    for (const d of (domainRows ?? []) as unknown as Array<{ id: string; name: string; controls: { id: string }[] }>) {
      for (const c of d.controls ?? []) domainByControl.set(c.id, d.name)
    }

    // 3. Branding cabinet
    if (mission.cabinet_id) {
      const { data: branding } = await supabase
        .from('organization_branding')
        .select('primary_color, accent_color')
        .eq('organization_id', mission.cabinet_id)
        .maybeSingle()
      if (signal?.aborted) return
      const br = branding as { primary_color: string | null; accent_color: string | null } | null
      setBrand({
        primary: br?.primary_color ?? DEFAULT_BRAND.primary,
        accent: br?.accent_color ?? DEFAULT_BRAND.accent,
      })
    }

    // 4. Enrichir CAR avec domain_name (via assessment.control_id)
    const assessIds = (carRows ?? []).map((c) => c.assessment_id)
    const ctrlByAssess = new Map<string, string>()
    if (assessIds.length > 0) {
      const { data: aRows } = await supabase
        .from('control_assessments')
        .select('id, control_id')
        .in('id', assessIds)
      if (signal?.aborted) return
      for (const a of aRows ?? []) ctrlByAssess.set(a.id, a.control_id)
    }
    // 4b. Resoudre les findings via finding_id (source de verite pour la classification)
    const findingIds = (carRows ?? [])
      .map((c) => c.finding_id)
      .filter((id): id is string => !!id)
    const findingById = new Map<string, AssessmentFinding>()
    if (findingIds.length > 0) {
      const { data: fRows } = await supabase
        .from('assessment_findings')
        .select('*')
        .in('id', findingIds)
      if (signal?.aborted) return
      for (const f of (fRows ?? []) as AssessmentFinding[]) {
        findingById.set(f.id, f)
      }
    }

    const enriched: ActionPlanCAR[] = (carRows ?? []).map((c) => {
      const ctrlId = ctrlByAssess.get(c.assessment_id)
      const domain = ctrlId ? domainByControl.get(ctrlId) : null
      const finding = c.finding_id ? findingById.get(c.finding_id) ?? null : null
      return { ...(c as ActionPlanCAR), domain_name: domain ?? null, finding }
    })
    setCars(enriched)

    // 5. Contacts du portail client (pour le select responsable + display)
    if (mission.client_id) {
      const { data: cabClient } = await supabase
        .from('cabinet_clients')
        .select('id')
        .eq('client_organization_id', mission.client_id)
        .eq('cabinet_id', mission.cabinet_id)
        .maybeSingle()
      if (signal?.aborted) return
      const cab = cabClient as { id: string } | null
      if (cab) {
        const { data: contactRows } = await supabase
          .from('client_portal_contacts')
          .select('id, contact_name, email')
          .eq('cabinet_client_id', cab.id)
        if (signal?.aborted) return
        const list = (contactRows ?? []) as unknown as ClientContact[]
        setContacts(list)
        const cMap = new Map<string, string>()
        for (const c of list) cMap.set(c.id, c.contact_name ?? c.email)
        setContactNames(cMap)
      }
    }

    // 6. Auditeurs référencés dans created_by / verified_by → noms pour timeline
    const userIds = new Set<string>()
    for (const c of enriched) {
      if (c.created_by) userIds.add(c.created_by)
      if (c.verified_by) userIds.add(c.verified_by)
    }
    if (userIds.size > 0) {
      const { data: uRows } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', Array.from(userIds))
      if (signal?.aborted) return
      const uMap = new Map<string, string>()
      for (const u of (uRows ?? []) as unknown as Array<{ id: string; first_name: string | null; last_name: string | null; email: string }>) {
        const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
        uMap.set(u.id, name || u.email)
      }
      setUserNames(uMap)
    }

    setLoading(false)
  }, [mission.id, mission.cabinet_id, mission.client_id, mission.framework_id])

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    void load(ac.signal)
    return () => ac.abort()
  }, [load])

  const reload = useCallback(async (): Promise<void> => { await load() }, [load])

  const exportXLSX = useCallback(async (): Promise<void> => {
    if (cars.length === 0) {
      toast.error('Aucune action à exporter')
      return
    }
    setBusy(true)
    try {
      await generateActionPlanXLSX({
        missionName: mission.name,
        clientName: mission.client_name ?? 'Client',
        frameworkLabel: mission.framework_name ?? 'Référentiel',
        reportDate: new Date().toLocaleDateString('fr-FR'),
        brandPrimary: brand.primary,
        brandAccent: brand.accent,
        cars,
      })
      toast.success("Plan d'action exporté")
    } catch (err) {
      toast.error('Export impossible', err)
    } finally {
      setBusy(false)
    }
  }, [cars, mission, brand, toast])

  const submitResponse = useCallback(async (carId: string, payload: SubmitPayload): Promise<boolean> => {
    setBusy(true)
    try {
      const { error } = await supabase
        .from('corrective_action_requests')
        .update({
          client_root_cause: payload.rootCause || null,
          client_action: payload.action || null,
          client_target_date: payload.targetDate || null,
          client_responsible_id: payload.responsibleId,
          status: 'client_responded',
        })
        .eq('id', carId)
      if (error) {
        toast.error('Soumission impossible', error.message)
        return false
      }
      toast.success('Réponse soumise. L’auditeur va la vérifier.')
      await load()
      return true
    } catch (err) {
      toast.error('Soumission impossible', err)
      return false
    } finally {
      setBusy(false)
    }
  }, [toast, load])

  return { cars, loading, busy, contacts, userNames, contactNames, reload, exportXLSX, submitResponse }
}
