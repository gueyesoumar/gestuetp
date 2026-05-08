import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import { generateActionPlanXLSX, type ActionPlanCAR } from '../../reports/generateActionPlanXLSX'
import type { MissionDetail } from '../useMissionDetail'
import type { AssessmentFinding } from '../../../types/database.types'

interface FindingCounts {
  major_nc: number
  minor_nc: number
  observation: number
}

interface BrandColors {
  primary: string
  accent: string
}

const DEFAULT_BRAND: BrandColors = { primary: '#1B4332', accent: '#D4A843' }

interface UseActionPlanResult {
  cars: ActionPlanCAR[]
  loading: boolean
  busy: boolean
  previewOpen: boolean
  findings: FindingCounts
  userNames: Map<string, string>
  contactNames: Map<string, string>
  reload: () => Promise<void>
  openPreviewOrExport: () => Promise<void>
  closePreview: () => void
  openPreview: () => void
  confirmGeneration: () => Promise<void>
  exportXLSX: () => Promise<void>
}

export function useActionPlan(mission: MissionDetail): UseActionPlanResult {
  const toast = useToast()
  const [cars, setCars] = useState<ActionPlanCAR[]>([])
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map())
  const [contactNames, setContactNames] = useState<Map<string, string>>(new Map())
  const [findings, setFindings] = useState<FindingCounts>({ major_nc: 0, minor_nc: 0, observation: 0 })
  const [brand, setBrand] = useState<BrandColors>(DEFAULT_BRAND)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const loadAll = useCallback(async (signal?: AbortSignal): Promise<void> => {
    // 1. CAR de la mission
    const { data: carRows, error: carErr } = await supabase
      .from('corrective_action_requests')
      .select('*')
      .eq('mission_id', mission.id)
      .order('code', { ascending: true })
    if (signal?.aborted) return
    if (carErr) {
      console.error('useActionPlan cars:', carErr.message)
      setLoading(false)
      return
    }

    // 2. Compte des findings classifiés (pour la preview avant génération)
    //    Source : assessment_findings (1 row par finding) au lieu des textareas legacy.
    const { data: missionAssessIds, error: assessErr } = await supabase
      .from('control_assessments')
      .select('id')
      .eq('mission_id', mission.id)
    if (signal?.aborted) return
    if (assessErr) {
      console.error('useActionPlan assessments:', assessErr.message)
    }

    const counts: FindingCounts = { major_nc: 0, minor_nc: 0, observation: 0 }
    const assessIdsForCount = (missionAssessIds ?? []).map((a) => a.id)
    if (assessIdsForCount.length > 0) {
      const { data: findingRows } = await supabase
        .from('assessment_findings')
        .select('classification')
        .in('assessment_id', assessIdsForCount)
        .in('classification', ['major_nc', 'minor_nc', 'observation'])
      if (signal?.aborted) return
      for (const f of (findingRows ?? []) as Array<{ classification: keyof FindingCounts }>) {
        if (f.classification in counts) counts[f.classification] += 1
      }
    }
    setFindings(counts)

    // 3. Map control_id → domain_name (pour XLSX)
    const { data: domainRows } = await supabase
      .from('domains')
      .select('id, name, controls(id)')
      .eq('framework_id', mission.framework_id)
    if (signal?.aborted) return
    const map = new Map<string, string>()
    for (const d of (domainRows ?? []) as unknown as Array<{ id: string; name: string; controls: { id: string }[] }>) {
      for (const c of d.controls ?? []) map.set(c.id, d.name)
    }

    // 4. Branding cabinet
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

    // 5. Enrichir CAR avec domain_name (via assessment.control_id → domain)
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

    // 5b. Resoudre les findings via finding_id (source de verite pour la classification)
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
      const domain = ctrlId ? map.get(ctrlId) : null
      const finding = c.finding_id ? findingById.get(c.finding_id) ?? null : null
      return { ...(c as ActionPlanCAR), domain_name: domain ?? null, finding }
    })
    setCars(enriched)

    // 6. Charger les noms d'utilisateurs (auteurs CAR + auditeurs vérifieurs) pour la timeline
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

    // 7. Charger les noms des responsables internes côté client
    const contactIds = new Set<string>()
    for (const c of enriched) {
      if (c.client_responsible_id) contactIds.add(c.client_responsible_id)
    }
    if (contactIds.size > 0) {
      const { data: cRows } = await supabase
        .from('client_portal_contacts')
        .select('id, contact_name, email')
        .in('id', Array.from(contactIds))
      if (signal?.aborted) return
      const cMap = new Map<string, string>()
      for (const c of (cRows ?? []) as unknown as Array<{ id: string; contact_name: string | null; email: string }>) {
        cMap.set(c.id, c.contact_name ?? c.email)
      }
      setContactNames(cMap)
    }

    setLoading(false)
  }, [mission.id, mission.framework_id, mission.cabinet_id])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    void loadAll(controller.signal)
    return () => controller.abort()
  }, [loadAll])

  const exportXLSX = useCallback(async (): Promise<void> => {
    if (cars.length === 0) {
      toast.error('Aucune action à exporter')
      return
    }
    setBusy(true)
    try {
      const frameworkLabel = (mission as unknown as { framework?: { name?: string | null } }).framework?.name ?? 'Référentiel'
      const clientName = (mission as unknown as { client?: { name?: string | null } }).client?.name ?? 'Client'
      await generateActionPlanXLSX({
        missionName: mission.name,
        clientName,
        frameworkLabel,
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

  const openPreviewOrExport = useCallback(async (): Promise<void> => {
    if (cars.length > 0) {
      await exportXLSX()
      return
    }
    setPreviewOpen(true)
  }, [cars.length, exportXLSX])

  const closePreview = useCallback(() => setPreviewOpen(false), [])
  const openPreview = useCallback(() => setPreviewOpen(true), [])
  const reload = useCallback(async (): Promise<void> => { await loadAll() }, [loadAll])

  const confirmGeneration = useCallback(async (): Promise<void> => {
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-action-plan', {
        body: { mission_id: mission.id },
      })
      if (error || data?.error) {
        toast.error('Génération impossible', error?.message ?? data?.error)
        return
      }
      const created = (data?.created as number | undefined) ?? 0
      toast.success(`${created} action${created > 1 ? 's' : ''} créée${created > 1 ? 's' : ''}`)
      setPreviewOpen(false)
      await loadAll()
    } catch (err) {
      toast.error('Génération impossible', err)
    } finally {
      setBusy(false)
    }
  }, [mission.id, toast, loadAll])

  return {
    cars,
    loading,
    busy,
    previewOpen,
    findings,
    userNames,
    contactNames,
    reload,
    openPreviewOrExport,
    closePreview,
    openPreview,
    confirmGeneration,
    exportXLSX,
  }
}
