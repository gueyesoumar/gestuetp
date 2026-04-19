import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { EvidenceCatalogItem, Control } from '../../types/database.types'
import type { DomainWithControls } from '../frameworks/useFrameworkDetail'

export interface EvidenceByControl {
  control: Control
  domainCode: string
  domainName: string
  evidences: EvidenceCatalogItem[]
}

interface UseEvidenceCatalogResult {
  evidenceByControl: EvidenceByControl[]
  loading: boolean
  error: string | null
}

export function useEvidenceCatalog(domains: DomainWithControls[]): UseEvidenceCatalogResult {
  const [evidenceByControl, setEvidenceByControl] = useState<EvidenceByControl[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (domains.length === 0) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    const allControlIds = domains.flatMap((d) => d.controls.map((c) => c.id))

    if (allControlIds.length === 0) {
      setLoading(false)
      return
    }

    supabase
      .from('evidence_catalog')
      .select('*')
      .in('control_id', allControlIds)
      .order('sort_order')
      .abortSignal(abortController.signal)
      .then(({ data, error: queryError }) => {
        if (abortController.signal.aborted) return
        if (queryError) {
          console.error('useEvidenceCatalog:', queryError.message)
          setError('Impossible de charger le catalogue de preuves.')
          setLoading(false)
          return
        }

        const evidenceMap = new Map<string, EvidenceCatalogItem[]>()
        for (const item of data ?? []) {
          const list = evidenceMap.get(item.control_id) ?? []
          list.push(item)
          evidenceMap.set(item.control_id, list)
        }

        const result: EvidenceByControl[] = []
        for (const domain of domains) {
          for (const control of domain.controls) {
            const evidences = evidenceMap.get(control.id)
            if (evidences && evidences.length > 0) {
              result.push({
                control,
                domainCode: domain.code,
                domainName: domain.name,
                evidences,
              })
            }
          }
        }

        setEvidenceByControl(result)
        setLoading(false)
      })

    return () => abortController.abort()
  }, [domains])

  return { evidenceByControl, loading, error }
}
