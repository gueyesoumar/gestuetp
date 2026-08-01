import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { readInvokeError } from '../../lib/edgeError'
import { useToast } from '../../hooks/useToast'

interface UseCloseCycleResult {
  busy: boolean
  closeCycle: (cycleId: string) => Promise<boolean>
}

export function useCloseCycle(onSuccess?: () => void | Promise<void>): UseCloseCycleResult {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const closeCycle = useCallback(async (cycleId: string): Promise<boolean> => {
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('close-cycle', {
        body: { cycle_id: cycleId },
      })
      if (error || data?.error) {
        const msg = await readInvokeError(error, data, 'Clôture impossible')
        toast.error('Clôture impossible', msg)
        return false
      }
      const next = data?.next_cycle as { period_label?: string } | null
      toast.success('Cycle clôturé', {
        description: next?.period_label ? `Prochain cycle ouvert : ${next.period_label}` : undefined,
      })
      if (onSuccess) await onSuccess()
      return true
    } catch (err) {
      toast.error('Clôture impossible', err)
      return false
    } finally {
      setBusy(false)
    }
  }, [toast, onSuccess])

  return { busy, closeCycle }
}
