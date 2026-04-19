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

export function useClientExpectedDocuments(missionId: string): UseClientExpectedDocumentsReturn {
  const [expectedDocs, setExpectedDocs] = useState<ExpectedDocument[]>([])
  const [coveredControls, setCoveredControls] = useState(0)
  const [totalControls, setTotalControls] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setLoading(true)

      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) { setLoading(false); return }

      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = { 'apikey': apikey, 'Authorization': `Bearer ${token}` }

      // 1. Get the mission's framework_id
      const missionRes = await fetch(
        `${baseUrl}/rest/v1/missions?id=eq.${missionId}&select=framework_id`,
        { headers }
      )
      if (!missionRes.ok) { setLoading(false); return }
      const missions = await missionRes.json() as { framework_id: string }[]
      if (!missions.length) { setLoading(false); return }
      const frameworkId = missions[0].framework_id

      // 2. Get all controls for this framework (via domains)
      const domainRes = await fetch(
        `${baseUrl}/rest/v1/domains?framework_id=eq.${frameworkId}&select=id`,
        { headers }
      )
      if (!domainRes.ok) { setLoading(false); return }
      const domains = await domainRes.json() as { id: string }[]
      const domainIds = domains.map((d) => d.id)

      if (domainIds.length === 0) { setLoading(false); return }

      const ctrlRes = await fetch(
        `${baseUrl}/rest/v1/controls?domain_id=in.(${domainIds.join(',')})&select=id,code`,
        { headers }
      )
      if (!ctrlRes.ok) { setLoading(false); return }
      const controls = await ctrlRes.json() as { id: string; code: string }[]
      const controlIds = controls.map((c) => c.id)
      const controlCodeMap = Object.fromEntries(controls.map((c) => [c.id, c.code]))
      setTotalControls(controlIds.length)

      if (controlIds.length === 0) { setLoading(false); return }

      // 3. Get evidence catalog items for these controls
      // Split into chunks to avoid URL too long
      const chunkSize = 50
      const allCatalogItems: { id: string; name: string; description: string | null; is_required: boolean; control_id: string }[] = []

      for (let i = 0; i < controlIds.length; i += chunkSize) {
        const chunk = controlIds.slice(i, i + chunkSize)
        const catRes = await fetch(
          `${baseUrl}/rest/v1/evidence_catalog?control_id=in.(${chunk.join(',')})&select=id,name,description,is_required,control_id&order=sort_order`,
          { headers }
        )
        if (catRes.ok) {
          const items = await catRes.json() as typeof allCatalogItems
          allCatalogItems.push(...items)
        }
      }

      if (allCatalogItems.length === 0) { setExpectedDocs([]); setLoading(false); return }

      // 4. Get uploaded documents for this mission (include description for matching)
      const docRes = await fetch(
        `${baseUrl}/rest/v1/documents?mission_id=eq.${missionId}&select=id,file_name,description`,
        { headers }
      )
      const uploadedDocs = docRes.ok
        ? await docRes.json() as { id: string; file_name: string; description: string | null }[]
        : []

      // Build a set of evidence names that have been uploaded (via [EVIDENCE:xxx] tag)
      const uploadedEvidenceNames = new Set<string>()
      for (const doc of uploadedDocs) {
        if (doc.description) {
          const match = doc.description.match(/\[EVIDENCE:(.+?)\]/)
          if (match) uploadedEvidenceNames.add(match[1])
        }
      }

      // 5. Group by document name (deduplicate), collect control codes + IDs
      const docGroups = new Map<string, {
        id: string
        name: string
        description: string | null
        isRequired: boolean
        controlCodes: string[]
        controlIds: string[]
      }>()

      for (const cat of allCatalogItems) {
        const code = controlCodeMap[cat.control_id] ?? ''
        const existing = docGroups.get(cat.name)
        if (existing) {
          if (code && !existing.controlCodes.includes(code)) {
            existing.controlCodes.push(code)
          }
          if (cat.control_id && !existing.controlIds.includes(cat.control_id)) {
            existing.controlIds.push(cat.control_id)
          }
          if (cat.is_required) existing.isRequired = true
        } else {
          docGroups.set(cat.name, {
            id: cat.id,
            name: cat.name,
            description: cat.description,
            isRequired: cat.is_required,
            controlCodes: code ? [code] : [],
            controlIds: cat.control_id ? [cat.control_id] : [],
          })
        }
      }

      // 6. Build result
      const result: ExpectedDocument[] = []
      const coveredControlSet = new Set<string>()

      for (const [, group] of docGroups) {
        // Check if uploaded via [EVIDENCE:xxx] tag in description
        const isUploaded = uploadedEvidenceNames.has(group.name)

        const matchedFile = isUploaded
          ? uploadedDocs.find((d) => d.description?.includes(`[EVIDENCE:${group.name}]`))?.file_name ?? null
          : null

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
          uploadedFileName: matchedFile,
        })
      }

      // Sort: required first, then pending, then by control count
      result.sort((a, b) => {
        if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
        return b.controlCodes.length - a.controlCodes.length
      })

      setCoveredControls(coveredControlSet.size)
      setExpectedDocs(result)
      setLoading(false)
    }

    fetchData()
  }, [missionId, refreshKey])

  const pendingCount = expectedDocs.filter((d) => d.status === 'pending').length
  const uploadedCount = expectedDocs.filter((d) => d.status === 'uploaded').length

  return { expectedDocs, pendingCount, uploadedCount, coveredControls, totalControls, loading, refetch }
}
