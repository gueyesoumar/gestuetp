import { useState } from 'react'

interface Props {
  zone: string
  busy: boolean
  onCancel: () => void
  onSubmit: (hostname: string, reason: string) => void
}

// Modale d'ajout d'un sous-domaine cabinet (marque blanche niveau 3). La
// validation de suffixe et l'appel edge sont pilotés par le parent.
export function AddDomainModal({ zone, busy, onCancel, onSubmit }: Props): JSX.Element {
  const [hostname, setHostname] = useState('')
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-[14.5px] font-bold text-gray-900">Ajouter un domaine</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Sous-domaine</label>
            <input type="text" value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder={`client.${zone}`} className="w-full font-mono text-[12.5px]" disabled={busy} />
            <p className="text-[10.5px] text-gray-400 mt-1">Vercel et le DNS ({zone}) sont configurés automatiquement. Sous-domaines de {zone} uniquement.</p>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Motif <span className="text-red-500">*</span></label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Pourquoi ajouter ce domaine ?" className="w-full text-[12.5px]" disabled={busy} />
          </div>
        </div>
        <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onCancel} disabled={busy} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button onClick={() => onSubmit(hostname, reason)} disabled={busy || !reason.trim() || !hostname.trim()} className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg bg-forest-700 text-white hover:bg-forest-900 disabled:opacity-50">
            {busy ? 'Création…' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}
