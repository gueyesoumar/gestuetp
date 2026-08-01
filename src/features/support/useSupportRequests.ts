import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { SupportRequestInsert } from '../../types/database.types'

export interface CreateSupportResult {
  ok: boolean
  id?: string
}

interface UseCreateSupportRequest {
  creating: boolean
  error: string | null
  create: (input: SupportRequestInsert) => Promise<CreateSupportResult>
}

/**
 * Creation d'un ticket de support (bug / demande / suggestion).
 * Insertion unique sur action utilisateur (pas de useEffect -> pas d'AbortController).
 * Le cloisonnement est garanti cote serveur par la RLS de support_requests.
 */
export function useCreateSupportRequest(): UseCreateSupportRequest {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (input: SupportRequestInsert): Promise<CreateSupportResult> => {
    setCreating(true)
    setError(null)

    // Cast : les types Insert sont intersectes avec Rec dans database.types ; un objet
    // typé interface n'est pas structurellement Record<string,unknown> (idiome du repo).
    const { data, error: insertError } = await supabase
      .from('support_requests')
      .insert(input as SupportRequestInsert & Record<string, unknown>)
      .select('id')
      .single()

    setCreating(false)

    if (insertError) {
      console.error('useCreateSupportRequest:', insertError.message)
      setError('Impossible d’envoyer votre demande pour le moment. Veuillez reessayer.')
      return { ok: false }
    }

    return { ok: true, id: (data as { id: string }).id }
  }, [])

  return { creating, error, create }
}
