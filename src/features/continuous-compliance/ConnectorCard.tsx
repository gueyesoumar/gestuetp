import { useState } from 'react'
import { ShieldCheck, RefreshCw, Plug } from 'lucide-react'
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction'
import { useToast } from '../../hooks/useToast'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import type { ConnectorIntegration } from '../../types/database.types'
import type { ConnectorDescriptor } from './connectors'

interface Props {
  descriptor: ConnectorDescriptor
  integration: ConnectorIntegration | null
  onChanged: () => void
}

/** Connexion / état d'un connecteur + déclenchement d'une collecte (RFC 0014). */
export function ConnectorCard({ descriptor, integration, onChanged }: Props): JSX.Element {
  const toast = useToast()
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const connected = integration?.status === 'active'
  const setField = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }))

  const connect = async () => {
    if (descriptor.fields.some((f) => !values[f.key]?.trim())) { setFormError('Tous les champs sont requis.'); return }
    setBusy(true); setFormError(null)
    const payload: Record<string, unknown> = { action: 'connect' }
    for (const f of descriptor.fields) payload[f.key] = values[f.key].trim()
    const res = await invokeEdgeFunction(descriptor.edge, payload)
    setBusy(false)
    if (!res.ok) { setFormError(res.error ?? 'Connexion impossible.'); return }
    setValues({}); toast.success(`${descriptor.label} connecté`); onChanged()
  }

  const collect = async () => {
    setBusy(true)
    const res = await invokeEdgeFunction(descriptor.edge, { action: 'collect' })
    setBusy(false)
    if (!res.ok) { toast.error('Collecte impossible', { description: res.error }); return }
    toast.success('Preuves collectées'); onChanged()
  }

  if (connected) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-forest-50 flex items-center justify-center"><ShieldCheck size={18} className="text-forest-700" /></div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900">{descriptor.label} connecté</p>
              <p className="text-[11px] text-gray-500">
                {integration?.external_account ?? ''}
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
          <p className="text-[13px] font-semibold text-gray-900">Connecter {descriptor.label}</p>
          <p className="text-[11px] text-gray-500">{descriptor.hint}</p>
        </div>
      </div>
      {formError && <div className="mb-3"><ErrorAlert message={formError} /></div>}
      <div className="grid gap-2 sm:grid-cols-2">
        {descriptor.fields.map((f) => (
          <input key={f.key} id={`${descriptor.provider}-${f.key}`} type={f.type ?? 'text'}
            value={values[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.label}
            className="px-3 py-2 border border-gray-200 rounded-lg text-[12px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100" />
        ))}
      </div>
      <button onClick={connect} disabled={busy}
        className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-forest-700 text-white hover:bg-forest-900 disabled:opacity-50">
        <Plug size={14} /> {busy ? 'Connexion…' : 'Connecter'}
      </button>
    </div>
  )
}
