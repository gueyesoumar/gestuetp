import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

export interface ExpectedDocument {
  id: string
  name: string
  description: string | null
  isRequired: boolean
  controlCodes: string[]
  controlIds: string[]
  status: 'pending' | 'uploaded'
  uploadedFileName: string | null
}

interface UseClientExpectedDocumentsReturn {
  expectedDocs: ExpectedDocument[]
  pendingCount: number
  uploadedCount: number
  coveredControls: number
  totalControls: number
  loading: boolean
  refetch: () => void
}

/**
 * Only returns documents that have been explicitly requested by the auditor
 * via mission_evidence_requests. The client never sees the full catalog.
 */
export function useClientExpectedDocuments(missionId: string): UseClientExpectedDocumentsReturn {
  const [expectedDocs, setExpectedDocs] = useState<ExpectedDocument[]>([])
  const [coveredControls, setCoveredControls] = useState(0)
  const [totalControls, setTotalControls] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    const controller = new AbortController()

    const fetchData = async (): Promise<void> => {
      setLoading(true)

      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) { setLoading(false); return }

      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = { 'apikey': apikey, 'Authorization': `Bearer ${token}` }

      // 1. Get evidence requests for this mission (only what auditor demanded)
      const reqRes = await fetch(
        `${baseUrl}/rest/v1/mission_evidence_requests?mission_id=eq.${missionId}&select=evidence_catalog_id`,
        { headers, signal: controller.signal }
      )
      if (controller.signal.aborted) return
      if (!reqRes.ok) { setLoading(false); return }
      const requestRows = await reqRes.json() as { evidence_catalog_id: string }[]

      if (requestRows.length === 0) {
        setExpectedDocs([])
        setCoveredControls(0)
        setTotalControls(0)
        setLoading(false)
        return
      }

      const requestedCatalogIds = requestRows.map((r) => r.evidence_catalog_id)

      // 2. Fetch the catalog items for these IDs
      const catRes = await fetch(
        `${baseUrl}/rest/v1/evidence_catalog?id=in.(${requestedCatalogIds.join(',')})&select=id,name,description,is_required,control_id&order=sort_order`,
        { headers, signal: controller.signal }
      )
      if (controller.signal.aborted) return
      if (!catRes.ok) { setLoading(false); return }
      const catalogItems = await catRes.json() as {
        id: string; name: string; description: string | null; is_required: boolean; control_id: string
      }[]

      if (catalogItems.length === 0) { setExpectedDocs([]); setLoading(false); return }

      // 3. Fetch control codes for display
      const controlIds = [...new Set(catalogItems.map((c) => c.control_id))]
      let controlCodeMap: Record<string, string> = {}
      if (controlIds.length > 0) {
        const ctrlRes = await fetch(
          `${baseUrl}/rest/v1/controls?id=in.(${controlIds.join(',')})&select=id,code`,
          { headers, signal: controller.signal }
        )
        if (controller.signal.aborted) return
        if (ctrlRes.ok) {
          const controls = await ctrlRes.json() as { id: string; code: string }[]
          controlCodeMap = Object.fromEntries(controls.map((c) => [c.id, c.code]))
        }
      }

      // 4. Get total controls for this mission (for coverage stat)
      const mRes = await fetch(`${baseUrl}/rest/v1/missions?id=eq.${missionId}&select=framework_id`, { headers, signal: controller.signal })
      if (controller.signal.aborted) return
      let totalCtrlCount = 0
      if (mRes.ok) {
        const missions = await mRes.json() as { framework_id: string }[]
        if (missions.length > 0) {
          const domRes = await fetch(`${baseUrl}/rest/v1/domains?framework_id=eq.${missions[0].framework_id}&select=id`, { headers, signal: controller.signal })
          if (controller.signal.aborted) return
          if (domRes.ok) {
            const doms = await domRes.json() as { id: string }[]
            if (doms.length > 0) {
              const cRes = await fetch(
                `${baseUrl}/rest/v1/controls?domain_id=in.(${doms.map((d) => d.id).join(',')})&select=id`,
                { headers, signal: controller.signal, method: 'HEAD' }
              )
              if (controller.signal.aborted) return
              // Use count header or fallback
              const countHeader = cRes.headers.get('content-range')
              if (countHeader) {
                const match = countHeader.match(/\/(\d+)/)
                if (match) totalCtrlCount = parseInt(match[1], 10)
              }
            }
          }
        }
      }
      setTotalControls(totalCtrlCount)

      // 5. Check which have been uploaded
      const docRes = await fetch(
        `${baseUrl}/rest/v1/documents?mission_id=eq.${missionId}&select=file_name,description`,
        { headers, signal: controller.signal }
      )
      if (controller.signal.aborted) return
      const uploadedDocs = docRes.ok
        ? await docRes.json() as { file_name: string; description: string | null }[]
        : []

      const uploadedEvidenceNames = new Set<string>()
      const uploadedFileMap = new Map<string, string>()
      for (const doc of uploadedDocs) {
        const match = doc.description?.match(/\[EVIDENCE:(.+?)\]/)
        if (match) {
          uploadedEvidenceNames.add(match[1])
          uploadedFileMap.set(match[1], doc.file_name)
        }
      }

      // 6. Group by name (deduplicate), collect control codes
      const docGroups = new Map<string, {
        id: string; name: string; description: string | null
        isRequired: boolean; controlCodes: string[]; controlIds: string[]
      }>()

      for (const cat of catalogItems) {
        const code = controlCodeMap[cat.control_id] ?? ''
        const existing = docGroups.get(cat.name)
        if (existing) {
          if (code && !existing.controlCodes.includes(code)) existing.controlCodes.push(code)
          if (!existing.controlIds.includes(cat.control_id)) existing.controlIds.push(cat.control_id)
          if (cat.is_required) existing.isRequired = true
        } else {
          docGroups.set(cat.name, {
            id: cat.id, name: cat.name, description: cat.description,
            isRequired: cat.is_required,
            controlCodes: code ? [code] : [],
            controlIds: [cat.control_id],
          })
        }
      }

      // 7. Build result
      const result: ExpectedDocument[] = []
      const coveredControlSet = new Set<string>()

      for (const [, group] of docGroups) {
        const isUploaded = uploadedEvidenceNames.has(group.name)
        if (isUploaded) {
          group.controlCodes.forEach((c) => coveredControlSet.add(c))
        }
        result.push({
          id: group.id,
          name: group.name,
          description: group.description,
          isRequired: group.isRequired,
          controlCodes: group.controlCodes.sort(),
          controlIds: group.controlIds,
          status: isUploaded ? 'uploaded' : 'pending',
          uploadedFileName: uploadedFileMap.get(group.name) ?? null,
        })
      }

      // Sort: required first, then pending, then by name
      result.sort((a, b) => {
        if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      setCoveredControls(coveredControlSet.size)
      setExpectedDocs(result)
      setLoading(false)
    }

    fetchData()
    return () => controller.abort()
  }, [missionId, refreshKey])

  const pendingCount = expectedDocs.filter((d) => d.status === 'pending').length
  const uploadedCount = expectedDocs.filter((d) => d.status === 'uploaded').length

  return { expectedDocs, pendingCount, uploadedCount, coveredControls, totalControls, loading, refetch }
}
