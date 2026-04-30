import { useCallback, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'

export type VerifyAction = 'accept' | 'reject' | 'request_precision'

interface UseCARVerificationResult {
  busy: boolean
  verify: (carId: string, action: VerifyAction, comment?: string) => Promise<boolean>
}

export function useCARVerification(onSuccess: () => void | Promise<void>): UseCARVerificationResult {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const verify = useCallback(async (carId: string, action: VerifyAction, comment?: string): Promise<boolean> => {
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('verify-car', {
        body: { car_id: carId, action, comment: comment ?? null },
      })
      if (error || data?.error) {
        toast.error('Vérification impossible', error?.message ?? data?.error)
        return false
      }
      const labels: Record<VerifyAction, string> = {
        accept: 'Action corrective acceptée et clôturée',
        reject: 'Action rejetée',
        request_precision: 'Précision demandée au client',
      }
      toast.success(labels[action])
      await onSuccess()
      return true
    } catch (err) {
      toast.error('Vérification impossible', err)
      return false
    } finally {
      setBusy(false)
    }
  }, [toast, onSuccess])

  return { busy, verify }
}
