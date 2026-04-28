import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { EvidenceDeclineReason } from '../../../types/database.types'

export interface AssessmentDeclineSource {
  requestId: string
  evidenceName: string
  reason: EvidenceDeclineReason | null
  justification: string | null
  declinerName: string | null
  declinedAt: string | null
}

/**
 * Si l'assessment provient d'une déclaration de document non disponible
 * transformée en constat (status='escalated_to_finding'), retourne le contexte
 * pour afficher la bannière dans ControlWorkArea. Sinon null.
 */
export function useAssessmentDeclineSource(assessmentId: string | null | undefined): AssessmentDeclineSource | null {
  const [source, setSource] = useState<AssessmentDeclineSource | null>(null)

  useEffect(() => {
    if (!assessmentId) { setSource(null); return }
    const ctrl = new AbortController()

    const fetchSource = async (): Promise<void> => {
      const { data: requests } = await supabase
        .from('mission_evidence_requests')
        .select('id, decline_reason, decline_justification, declined_by, declined_at, evidence_catalog_id')
        .eq('escalated_assessment_id', assessmentId)
        .abortSignal(ctrl.signal)
        .limit(1)
      if (ctrl.signal.aborted) return
      const req = (requests ?? [])[0] as {
        id: string
        decline_reason: EvidenceDeclineReason | null
        decline_justification: string | null
        declined_by: string | null
        declined_at: string | null
        evidence_catalog_id: string
      } | undefined
      if (!req) { setSource(null); return }

      const { data: cat } = await supabase
        .from('evidence_catalog')
        .select('name')
        .eq('id', req.evidence_catalog_id)
        .abortSignal(ctrl.signal)
        .single()
      if (ctrl.signal.aborted) return

      let declinerName: string | null = null
      if (req.declined_by) {
        const { data: user } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', req.declined_by)
          .abortSignal(ctrl.signal)
          .single()
        if (ctrl.signal.aborted) return
        if (user) declinerName = `${user.first_name} ${user.last_name}`
      }

      setSource({
        requestId: req.id,
        evidenceName: (cat as { name: string } | null)?.name ?? '—',
        reason: req.decline_reason,
        justification: req.decline_justification,
        declinerName,
        declinedAt: req.declined_at,
      })
    }

    fetchSource()
    return () => ctrl.abort()
  }, [assessmentId])

  return source
}
