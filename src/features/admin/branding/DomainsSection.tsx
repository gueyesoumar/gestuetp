import { useState } from 'react'
import { Plus, Trash2, CheckCircle2, Globe } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { readInvokeError } from '../../../lib/edgeError'
import { useToast } from '../../../hooks/useToast'
import type { CabinetDomainRow } from './useCabinetBrandingAdmin'

interface Props {
  cabinetId: string
  domains: CabinetDomainRow[]
  onChanged: () => void
}

const ZONE = (import.meta.env.VITE_TENANT_ZONE as string | undefined) ?? 'gestugroup.com'
const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/

// Les sous-domaines *.gestugroup.com sont servis par un domaine wildcard Vercel
// (SSL via délégation _acme-challenge) et filtrés par le middleware edge selon
// cabinet_domains. Ajouter un domaine = enregistrer une ligne active ; aucune
// configuration DNS ni Vercel par domaine n'est nécessaire.

export function DomainsSection({ cabinetId, domains, onChanged }: Props): JSX.Element {
  const [adding, setAdding] = useState(false)
  const [hostname, setHostname] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<'add' | { remove: string } | null>(null)
  const toast = useToast()

  const submitAdd = async (): Promise<void> => {
    const h = hostname.trim().toLowerCase()
    if (!HOSTNAME_RE.test(h) || !h.endsWith(`.${ZONE}`) || h === ZONE) {
      toast.error(`Sous-domaine de ${ZONE} attendu (ex: client.${ZONE})`)
      return
    }
    if (!reason.trim()) return
    setBusy('add')
    const { data, error } = await supabase.functions.invoke('admin-cabinet-domain', {
      body: { action: 'add', cabinet_id: cabinetId, hostname: h, reason },
    })
    setBusy(null)
    if (error || data?.error) {
      toast.error(await readInvokeError(error, data, 'Création impossible'))
      return
    }
    toast.success('Domaine ajouté', { description: 'Actif immédiatement via le wildcard.' })
    setAdding(false)
    setHostname('')
    setReason('')
    onChanged()
  }

  const remove = async (domain: CabinetDomainRow): Promise<void> => {
    const r = window.prompt(`Motif pour retirer ${domain.hostname} ?`)
    if (!r?.trim()) return
    setBusy({ remove: domain.id })
    const { data, error } = await supabase.functions.invoke('admin-cabinet-domain', {
      body: { action: 'remove', cabinet_id: cabinetId, domain_id: domain.id, reason: r },
    })
    setBusy(null)
    if (error || data?.error) {
      toast.error(await readInvokeError(error, data, 'Suppression impossible'))
      return
    }
    toast.success('Domaine retiré')
    onChanged()
  }

  const isBusyRemove = (id: string): boolean =>
    typeof busy === 'object' && busy !== null && 'remove' in busy && busy.remove === id

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <header className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <span className="text-[13px] font-bold text-gray-900">Domaines personnalisés</span>
          <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-gold-700 bg-gold-50 px-2 py-0.5 rounded-full">Niveau 3</span>
        </div>
        <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-forest-700 text-white rounded-lg text-[11.5px] font-semibold hover:bg-forest-900"><Plus size={13} /> Ajouter un domaine</button>
      </header>

      {domains.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-gray-500">
          Aucun domaine configuré. Le portail reste sur <span className="font-mono">app.gestugroup.com</span>.
        </div>
      ) : (
        <div>
          {domains.map((d, i) => (
            <div key={d.id} className={`px-4 py-3 flex items-center gap-3 ${i < domains.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <Globe size={15} className="text-gray-400 shrink-0" />
              <span className="font-mono text-[13px] font-bold text-gray-900">{d.hostname}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10.5px] font-bold"><CheckCircle2 size={11} /> Actif</span>
              <button onClick={() => remove(d)} disabled={isBusyRemove(d.id)} className="ml-auto inline-flex items-center gap-1 px-2 py-1 border border-red-200 bg-white text-red-700 rounded text-[11px] font-semibold hover:bg-red-50 disabled:opacity-50"><Trash2 size={11} /> Retirer</button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-[14.5px] font-bold text-gray-900">Ajouter un domaine</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Sous-domaine</label>
                <input type="text" value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder={`client.${ZONE}`} className="w-full font-mono text-[12.5px]" disabled={busy === 'add'} />
                <p className="text-[10.5px] text-gray-400 mt-1">Sous-domaines de {ZONE} uniquement. Actif immédiatement (DNS et SSL déjà gérés par le wildcard).</p>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Motif <span className="text-red-500">*</span></label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Pourquoi ajouter ce domaine ?" className="w-full text-[12.5px]" disabled={busy === 'add'} />
              </div>
            </div>
            <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => { setAdding(false); setHostname(''); setReason('') }} disabled={busy === 'add'} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button onClick={submitAdd} disabled={busy === 'add' || !reason.trim() || !hostname.trim()} className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg bg-forest-700 text-white hover:bg-forest-900 disabled:opacity-50">
                {busy === 'add' ? 'Ajout…' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
