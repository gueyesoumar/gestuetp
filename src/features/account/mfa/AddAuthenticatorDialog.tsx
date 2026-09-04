import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import QRCode from 'qrcode'
import { Modal } from '../../../components/ui/Modal'
import { useMfa } from '../../auth/mfa/useMfa'
import type { TotpEnrollment } from '../../auth/mfa/useMfa'

interface Props {
  open: boolean
  onClose: () => void
  onAdded: () => void
}

/**
 * Ajout self-service d'un authentificateur TOTP : nommage de l'appareil, puis
 * scan du QR et vérification du code. Le secret n'est affiché qu'ici, jamais
 * stocké côté client.
 */
export function AddAuthenticatorDialog({ open, onClose, onAdded }: Props): JSX.Element {
  const { busy, error, enrollTotp, verifyCode } = useMfa()
  const [name, setName] = useState('')
  const [enroll, setEnroll] = useState<TotpEnrollment | null>(null)
  const [qrPng, setQrPng] = useState<string | null>(null)
  const [code, setCode] = useState('')

  useEffect(() => {
    if (open) { setName(''); setEnroll(null); setQrPng(null); setCode('') }
  }, [open])

  useEffect(() => {
    if (!enroll?.uri) return
    QRCode.toDataURL(enroll.uri, { width: 200, margin: 1 })
      .then(setQrPng)
      .catch((err: unknown) => console.error('QR:', err instanceof Error ? err.message : String(err)))
  }, [enroll])

  const startEnroll = async (e: FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return
    const res = await enrollTotp(name.trim())
    if (res) setEnroll(res)
  }

  const confirm = async (e: FormEvent) => {
    e.preventDefault()
    if (!enroll || code.trim().length < 6) return
    const ok = await verifyCode(enroll.factorId, code.trim())
    if (ok) { onAdded(); onClose() }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ajouter un authentificateur">
      {!enroll ? (
        <form onSubmit={startEnroll} className="space-y-4">
          <p className="text-[13px] text-gray-500">Donnez un nom à cet appareil pour le reconnaître plus tard.</p>
          <input
            value={name} onChange={(e) => setName(e.target.value)} autoFocus
            placeholder="Ex : iPhone perso, Poste bureau…" maxLength={40}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
          />
          {error && <p className="text-[13px]" style={{ color: 'var(--color-error)' }}>{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-5 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-forest-50">Annuler</button>
            <button type="submit" disabled={busy || name.trim().length < 2} className="rounded-lg bg-forest-700 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-forest-900 disabled:opacity-50">
              {busy ? 'Préparation…' : 'Continuer'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={confirm} className="space-y-4">
          <ol className="text-[13px] text-gray-600 space-y-1 list-decimal list-inside">
            <li>Scannez ce QR code dans votre application d&apos;authentification.</li>
            <li>Saisissez le code à 6 chiffres généré.</li>
          </ol>
          <div className="flex justify-center">
            {qrPng ? (
              <img src={qrPng} alt="QR code de configuration TOTP" className="w-44 h-44 rounded-lg border border-gray-200 bg-white p-2" />
            ) : (
              <div className="w-44 h-44 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400">Génération du QR…</div>
            )}
          </div>
          <details>
            <summary className="text-xs text-gray-500 cursor-pointer">Impossible de scanner&nbsp;? Saisie manuelle</summary>
            <code className="block mt-2 text-xs bg-gray-50 border border-gray-200 rounded p-2 break-all">{enroll.secret}</code>
          </details>
          <input
            inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000" aria-label="Code à 6 chiffres"
            className="w-full text-center tracking-[0.4em] text-lg font-mono border border-gray-300 rounded-lg py-3 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
          />
          {error && <p className="text-[13px]" style={{ color: 'var(--color-error)' }}>{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-5 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-forest-50">Annuler</button>
            <button type="submit" disabled={busy || code.length < 6} className="rounded-lg bg-forest-700 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-forest-900 disabled:opacity-50">
              {busy ? 'Vérification…' : 'Activer'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
