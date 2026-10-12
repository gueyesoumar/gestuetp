import { useState } from 'react'
import { ShieldCheck, RefreshCw, Plug } from 'lucide-react'
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction'
import { useToast } from '../../hooks/useToast'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import type { ConnectorIntegration } from '../../types/database.types'

interface Props {
  integration: ConnectorIntegration | null
  onChanged: () => void
}

/** Connexion / état du connecteur Tenable + déclenchement d'une collecte (RFC 0014 P1.4). */
export function TenableConnectCard({ integration, onChanged }: Props): JSX.Element {
  const toast = useToast()
  const [accessKey, setAccessKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const connected = integration?.status === 'active'

  const connect = async () => {
    if (!accessKey.trim() || !secretKey.trim()) { setFormError('Les deux clés sont requises.'); return }
    setBusy(true); setFormError(null)
    const res = await invokeEdgeFunction('connector-tenable', { action: 'connect', accessKey: accessKey.trim(), secretKey: secretKey.trim() })
    setBusy(false)
    if (!res.ok) { setFormError(res.error ?? 'Connexion impossible.'); return }
    setAccessKey(''); setSecretKey('')
    toast.success('Tenable connecté')
    onChanged()
  }

  const collect = async () => {
    setBusy(true)
    const res = await invokeEdgeFunction('connector-tenable', { action: 'collect' })
    setBusy(false)
    if (!res.ok) { toast.error('Collecte impossible', { description: res.error }); return }
    toast.success('Preuves collectées')
    onChanged()
  }

  if (connected) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-forest-50 flex items-center justify-center"><ShieldCheck size={18} className="text-forest-700" /></div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900">Tenable connecté</p>
              <p className="text-[11px] text-gray-500">
                {integration?.external_account ?? 'cloud.tenable.com'}
                {integration?.last_sync_at ? ` · dernière collecte ${new Date(integration.last_sync_at).toLocaleString('fr-FR')}` : ' · aucune collecte'}
              </p>
            </div>
          </div>
          <button onClick={collect} disabled={busy}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-forest-700 text-white hover:bg-forest-900 disabled:opacity-50">
            <RefreshCw size={14} /> {busy ? 'Collecte…' : 'Collecter maintenant'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-gold-50 flex items-center justify-center"><Plug size={18} className="text-gold-700" /></div>
        <div>
          <p className="text-[13px] font-semibold text-gray-900">Connecter Tenable</p>
          <p className="text-[11px] text-gray-500">Clés d&apos;API (lecture seule) — stockées chiffrées. Générées dans Tenable &gt; Paramètres &gt; API Keys.</p>
        </div>
      </div>
      {formError && <div className="mb-3"><ErrorAlert message={formError} /></div>}
      <div className="grid gap-2 sm:grid-cols-2">
        <input id="tenable-access-key" value={accessKey} onChange={(e) => setAccessKey(e.target.value)} placeholder="Access key"
          className="px-3 py-2 border border-gray-200 rounded-lg text-[12px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100" />
        <input id="tenable-secret-key" type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="Secret key"
          className="px-3 py-2 border border-gray-200 rounded-lg text-[12px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100" />
      </div>
      <button onClick={connect} disabled={busy}
        className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-forest-700 text-white hover:bg-forest-900 disabled:opacity-50">
        <Plug size={14} /> {busy ? 'Connexion…' : 'Connecter'}
      </button>
    </div>
  )
}
