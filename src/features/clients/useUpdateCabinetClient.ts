import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { CabinetClientUpdate } from '../../types/database.types'

interface UseUpdateCabinetClientResult {
  updateClient: (id: string, data: CabinetClientUpdate) => Promise<boolean>
  updating: boolean
  error: string | null
}

export function useUpdateCabinetClient(onSuccess?: () => void): UseUpdateCabinetClientResult {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateClient = useCallback(async (id: string, data: CabinetClientUpdate): Promise<boolean> => {
    setUpdating(true)
    setError(null)

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) {
      setError('Non authentifi\u00e9')
      setUpdating(false)
      return false
    }

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/cabinet_clients?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('useUpdateCabinetClient:', res.status, text)
      setError('Impossible de mettre \u00e0 jour le client.')
      setUpdating(false)
      return false
    }

    setUpdating(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  return { updateClient, updating, error }
}
