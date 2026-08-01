import { useState, useCallback } from 'react'
import { useToast } from '../../../../hooks/useToast'
import { useDeclineEvidence } from '../../smart-interview/useDeclineEvidence'
import type { ExpectedDocument } from '../../smart-interview/useClientExpectedDocuments'
import type { EvidenceDeclineReason } from '../../../../types/database.types'

export interface EvidenceDeclineApi {
  decliningDoc: ExpectedDocument | null
  setDecliningDoc: (doc: ExpectedDocument | null) => void
  declineError: string | null
  setDeclineError: (e: string | null) => void
  declineSubmitting: boolean
  handleDecline: (reason: EvidenceDeclineReason, justification: string) => Promise<void>
  handleCancelDecline: (doc: ExpectedDocument) => Promise<void>
}

/**
 * Flux de déclaration « document non disponible » côté portail client.
 * Extrait de ClientExchangesTab (CLAUDE.md §2). Comportement inchangé.
 */
export function useEvidenceDeclineFlow(refetchExpected: () => void): EvidenceDeclineApi {
  const toast = useToast()
  const { declineDocument, cancelDeclaration, submitting: declineSubmitting } = useDeclineEvidence(refetchExpected)
  const [decliningDoc, setDecliningDoc] = useState<ExpectedDocument | null>(null)
  const [declineError, setDeclineError] = useState<string | null>(null)

  const handleDecline = useCallback(async (reason: EvidenceDeclineReason, justification: string): Promise<void> => {
    if (!decliningDoc) return
    setDeclineError(null)
    const result = await declineDocument({
      evidenceRequestIds: decliningDoc.evidenceRequestIds,
      reason,
      justification,
    })
    if (!result.ok) {
      setDeclineError(result.error ?? 'Erreur')
      return
    }
    toast.success(`Déclaration enregistrée pour « ${decliningDoc.name} »`)
    setDecliningDoc(null)
  }, [decliningDoc, declineDocument, toast])

  const handleCancelDecline = useCallback(async (doc: ExpectedDocument): Promise<void> => {
    const result = await cancelDeclaration(doc.evidenceRequestIds)
    if (!result.ok) {
      toast.error(result.error ?? 'Annulation impossible')
      return
    }
    toast.success(`Déclaration annulée pour « ${doc.name} »`)
  }, [cancelDeclaration, toast])

  return {
    decliningDoc, setDecliningDoc, declineError, setDeclineError,
    declineSubmitting, handleDecline, handleCancelDecline,
  }
}
