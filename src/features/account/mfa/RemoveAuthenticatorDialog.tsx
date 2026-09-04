import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { OtpInput } from '../../../components/ui/OtpInput'
import { useMfa } from '../../auth/mfa/useMfa'
import type { TotpFactor } from '../../auth/mfa/useMfa'

interface Props {
  open: boolean
  onClose: () => void
  factor: TotpFactor | null
  onRemoved: () => void
}

/**
 * Retrait d'un authentificateur, protégé par un step-up : l'utilisateur doit
 * saisir un code frais depuis un AUTRE facteur conservé (vérifié côté hook).
 */
export function RemoveAuthenticatorDialog({ open, onClose, factor, onRemoved }: Props): JSX.Element | null {
  const { busy, error, removeFactor } = useMfa()
  const [code, setCode] = useState('')
  const [attempt, setAttempt] = useState(0)
  const verifyingRef = useRef(false)

  useEffect(() => { if (open) setCode('') }, [open])

  if (!factor) return null

  const doRemove = async (theCode: string) => {
    if (verifyingRef.current || theCode.length < 6) return
    verifyingRef.current = true
    const ok = await removeFactor(factor.id, theCode)
    verifyingRef.current = false
    if (ok) { onRemoved(); onClose() }
    else { setCode(''); setAttempt((a) => a + 1) }
  }

  const submit = (e: FormEvent) => { e.preventDefault(); void doRemove(code) }

  return (
    <Modal open={open} onClose={onClose} title="Retirer un authentificateur">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-[13px] text-gray-600">
          Vous êtes sur le point de retirer <strong>{factor.friendlyName}</strong>. Pour confirmer,
          saisissez un code depuis <strong>un autre</strong> de vos authentificateurs.
        </p>
        <OtpInput key={attempt} value={code} onChange={setCode} onComplete={doRemove} disabled={busy} autoFocus invalid={!!error} />
        {error && <p className="text-center text-[13px]" style={{ color: 'var(--color-error)' }}>{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-5 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-forest-50">Annuler</button>
          <button type="submit" disabled={busy || code.length < 6} className="rounded-lg bg-red-600 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            {busy ? 'Retrait…' : 'Retirer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
