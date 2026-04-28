import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { EvidenceDeclineReason } from '../../../types/database.types'

interface DeclineParams {
  evidenceRequestIds: string[]
  reason: EvidenceDeclineReason
  justification: string
}

interface DeclineResult {
  declineDocument: (params: DeclineParams) => Promise<{ ok: boolean; error?: string }>
  cancelDeclaration: (evidenceRequestIds: string[]) => Promise<{ ok: boolean; error?: string }>
  submitting: boolean
}

/**
 * Wrappe les appels à decline-evidence-request pour le portail client.
 * Quand plusieurs mission_evidence_requests partagent le même nom (cas où
 * une preuve couvre plusieurs contrôles), on déclare/annule sur chacun.
 */
export function useDeclineEvidence(onChange: () => void): DeclineResult {
  const [submitting, setSubmitting] = useState(false)

  const declineDocument = useCallback(async (params: DeclineParams) => {
    if (params.evidenceRequestIds.length === 0) {
      return { ok: false, error: 'Aucune demande à déclarer' }
    }
    setSubmitting(true)
    let lastError: string | undefined
    for (const id of params.evidenceRequestIds) {
      const { data, error } = await supabase.functions.invoke('decline-evidence-request', {
        body: {
          evidence_request_id: id,
          action: 'decline',
          reason: params.reason,
          justification: params.justification,
        },
      })
      if (error || data?.error) {
        lastError = (data?.error as string | undefined) ?? error?.message ?? 'Erreur'
        break
      }
    }
    setSubmitting(false)
    if (lastError) return { ok: false, error: lastError }
    onChange()
    return { ok: true }
  }, [onChange])

  const cancelDeclaration = useCallback(async (evidenceRequestIds: string[]) => {
    if (evidenceRequestIds.length === 0) return { ok: false, error: 'Aucune demande' }
    setSubmitting(true)
    let lastError: string | undefined
    for (const id of evidenceRequestIds) {
      const { data, error } = await supabase.functions.invoke('decline-evidence-request', {
        body: { evidence_request_id: id, action: 'cancel' },
      })
      if (error || data?.error) {
        lastError = (data?.error as string | undefined) ?? error?.message ?? 'Erreur'
        break
      }
    }
    setSubmitting(false)
    if (lastError) return { ok: false, error: lastError }
    onChange()
    return { ok: true }
  }, [onChange])

  return { declineDocument, cancelDeclaration, submitting }
}
