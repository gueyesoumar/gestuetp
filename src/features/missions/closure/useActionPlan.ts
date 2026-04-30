import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import { generateActionPlanXLSX, type ActionPlanCAR } from '../../reports/generateActionPlanXLSX'
import type { MissionDetail } from '../useMissionDetail'

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
  openPreviewOrExport: () => Promise<void>
  closePreview: () => void
  confirmGeneration: () => Promise<void>
  exportXLSX: () => Promise<void>
}

export function useActionPlan(mission: MissionDetail): UseActionPlanResult {
  const toast = useToast()
  const [cars, setCars] = useState<ActionPlanCAR[]>([])
  const [domainsByControl, setDomainsByControl] = useState<Map<string, string>>(new Map())
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

    // 2. Compte des constats classifiés (pour la preview avant génération)
    const { data: assessRows, error: assessErr } = await supabase
      .from('control_assessments')
      .select('finding_classification, control_id')
      .eq('mission_id', mission.id)
      .in('finding_classification', ['major_nc', 'minor_nc', 'observation'])
    if (signal?.aborted) return
    if (assessErr) {
      console.error('useActionPlan assessments:', assessErr.message)
    }

    const counts: FindingCounts = { major_nc: 0, minor_nc: 0, observation: 0 }
    for (const a of assessRows ?? []) {
      const k = a.finding_classification as keyof FindingCounts | null
      if (k && k in counts) counts[k] += 1
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
    setDomainsByControl(map)

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

    const enriched: ActionPlanCAR[] = (carRows ?? []).map((c) => {
      const ctrlId = ctrlByAssess.get(c.assessment_id)
      const domain = ctrlId ? map.get(ctrlId) : null
      return { ...(c as ActionPlanCAR), domain_name: domain ?? null }
    })
    setCars(enriched)
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
    openPreviewOrExport,
    closePreview,
    confirmGeneration,
    exportXLSX,
  }
}
