import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../../components/ui/Modal'
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

  useEffect(() => { if (open) setCode('') }, [open])

  if (!factor) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (code.trim().length < 6) return
    const ok = await removeFactor(factor.id, code.trim())
    if (ok) { onRemoved(); onClose() }
  }

  return (
    <Modal open={open} onClose={onClose} title="Retirer un authentificateur">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-[13px] text-gray-600">
          Vous êtes sur le point de retirer <strong>{factor.friendlyName}</strong>. Pour confirmer,
          saisissez un code depuis <strong>un autre</strong> de vos authentificateurs.
        </p>
        <input
          inputMode="numeric" autoComplete="one-time-code" maxLength={6}
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000" aria-label="Code à 6 chiffres"
          className="w-full text-center tracking-[0.4em] text-lg font-mono border border-gray-300 rounded-lg py-3 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
        />
        {error && <p className="text-[13px]" style={{ color: 'var(--color-error)' }}>{error}</p>}
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
