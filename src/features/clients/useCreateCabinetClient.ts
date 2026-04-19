import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { CabinetClientInsert } from '../../types/database.types'

interface UseCreateCabinetClientResult {
  createClient: (data: Omit<CabinetClientInsert, 'cabinet_id'>) => Promise<string | null>
  creating: boolean
  error: string | null
}

export function useCreateCabinetClient(onSuccess?: () => void): UseCreateCabinetClientResult {
  const { profile } = useAuth()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createClient = useCallback(async (data: Omit<CabinetClientInsert, 'cabinet_id'>): Promise<string | null> => {
    if (!profile?.organization_id) return null
    setCreating(true)
    setError(null)

    const { data: created, error: insertError } = await supabase
      .from('cabinet_clients')
      .insert({
        ...data,
        cabinet_id: profile.organization_id,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('useCreateCabinetClient:', insertError.message)
      const msg = insertError.message.includes('duplicate')
        ? 'Ce client existe déjà dans votre portefeuille.'
        : 'Erreur lors de la création du client.'
      setError(msg)
      setCreating(false)
      return null
    }

    setCreating(false)
    onSuccess?.()
    return created.id
  }, [profile?.organization_id, onSuccess])

  return { createClient, creating, error }
}
