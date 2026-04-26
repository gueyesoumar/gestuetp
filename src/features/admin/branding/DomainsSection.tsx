import { useState } from 'react'
import { Plus, RefreshCw, Trash2, CheckCircle2, AlertCircle, Copy } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import type { CabinetDomainRow } from './useCabinetBrandingAdmin'

interface Props {
  cabinetId: string
  domains: CabinetDomainRow[]
  onChanged: () => void
}

const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/
const TENANT_TARGET = (import.meta.env.VITE_TENANT_CNAME_TARGET as string | undefined) ?? 'tenants.gestugroup.com'

export function DomainsSection({ cabinetId, domains, onChanged }: Props): JSX.Element {
  const [adding, setAdding] = useState(false)
  const [newHostname, setNewHostname] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState<'add' | { verify: string } | { remove: string } | null>(null)
  const toast = useToast()

  const submitAdd = async () => {
    const h = newHostname.trim().toLowerCase()
    if (!HOSTNAME_RE.test(h)) {
      toast.error('Hostname invalide (ex: audit.cabinet.com)')
      return
    }
    if (!reason.trim()) return
    setSubmitting('add')
    const { data, error } = await supabase.functions.invoke('admin-cabinet-domain', {
      body: { action: 'add', cabinet_id: cabinetId, hostname: h, reason },
    })
    setSubmitting(null)
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? 'Création impossible')
      return
    }
    toast.success('Domaine ajouté', { description: 'Configurez le DNS puis cliquez sur Vérifier' })
    setAdding(false)
    setNewHostname('')
    setReason('')
    onChanged()
  }

  const verify = async (domain: CabinetDomainRow) => {
    const r = window.prompt('Motif de la vérification ?', 'Vérification DNS de routine')
    if (!r?.trim()) return
    setSubmitting({ verify: domain.id })
    const { data, error } = await supabase.functions.invoke('dns-verify-tenant', {
      body: { action: 'verify', cabinet_id: cabinetId, domain_id: domain.id, reason: r },
    })
    setSubmitting(null)
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? 'Vérification impossible')
      return
    }
    if (data.verified) toast.success('Domaine vérifié et SSL émis')
    else toast.error('Vérification DNS échouée', { description: 'Voir le détail dans la liste' })
    onChanged()
  }

  const remove = async (domain: CabinetDomainRow) => {
    const r = window.prompt(`Motif pour supprimer ${domain.hostname} ?`)
    if (!r?.trim()) return
    setSubmitting({ remove: domain.id })
    const { data, error } = await supabase.functions.invoke('admin-cabinet-domain', {
      body: { action: 'remove', cabinet_id: cabinetId, domain_id: domain.id, reason: r },
    })
    setSubmitting(null)
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? 'Suppression impossible')
      return
    }
    toast.success('Domaine supprimé')
    onChanged()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <header className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <span className="text-[13px] font-bold text-gray-900">Domaines personnalisés</span>
          <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-gold-700 bg-gold-50 px-2 py-0.5 rounded-full">Niveau 3</span>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-forest-700 text-white rounded-lg text-[11.5px] font-semibold hover:bg-forest-900"
        ><Plus size={13} /> Ajouter un domaine</button>
      </header>

      {domains.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-gray-500">
          Aucun domaine configuré. Le portail client reste sur <span className="font-mono">app.gestugroup.com</span>.
        </div>
      ) : (
        <div>
          {domains.map((d, i) => (
            <DomainRow
              key={d.id}
              domain={d}
              isLast={i === domains.length - 1}
              onVerify={() => verify(d)}
              onRemove={() => remove(d)}
              busy={typeof submitting === 'object' && submitting !== null && (('verify' in submitting && submitting.verify === d.id) || ('remove' in submitting && submitting.remove === d.id))}
            />
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
                <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Hostname</label>
                <input type="text" value={newHostname} onChange={(e) => setNewHostname(e.target.value)} placeholder="audit.cabinet.com" className="w-full font-mono text-[12.5px]" disabled={submitting === 'add'} />
                <p className="text-[10.5px] text-gray-400 mt-1">Après création, configurez le DNS du cabinet : CNAME vers <span className="font-mono">{TENANT_TARGET}</span> + TXT _gestu-verify.&lt;hostname&gt; avec le token affiché.</p>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Motif <span className="text-red-500">*</span></label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Pourquoi ajouter ce domaine ?" className="w-full text-[12.5px]" disabled={submitting === 'add'} />
              </div>
            </div>
            <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => { setAdding(false); setNewHostname(''); setReason('') }} disabled={submitting === 'add'} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button onClick={submitAdd} disabled={submitting === 'add' || !reason.trim() || !newHostname.trim()} className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg bg-forest-700 text-white hover:bg-forest-900 disabled:opacity-50">
                {submitting === 'add' ? 'Création…' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DomainRow({ domain, isLast, onVerify, onRemove, busy }: { domain: CabinetDomainRow; isLast: boolean; onVerify: () => void; onRemove: () => void; busy: boolean }) {
  const toast = useToast()
  const copy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text)
    toast.success(`${label} copié`)
  }
  return (
    <div className={`px-4 py-4 ${!isLast ? 'border-b border-gray-100' : ''}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-mono text-[13px] font-bold text-gray-900">{domain.hostname}</span>
        {domain.is_verified ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10.5px] font-bold"><CheckCircle2 size={11} /> Vérifié</span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10.5px] font-bold"><AlertCircle size={11} /> En attente</span>
        )}
        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${domain.ssl_status === 'issued' ? 'bg-green-50 text-green-700' : domain.ssl_status === 'error' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500'}`}>SSL : {domain.ssl_status}</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={onVerify} disabled={busy} className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 bg-white text-gray-700 rounded text-[11px] font-semibold hover:bg-gray-50 disabled:opacity-50"><RefreshCw size={11} className={busy ? 'animate-spin' : ''} /> Vérifier</button>
          <button onClick={onRemove} disabled={busy} className="inline-flex items-center gap-1 px-2 py-1 border border-red-200 bg-white text-red-700 rounded text-[11px] font-semibold hover:bg-red-50 disabled:opacity-50"><Trash2 size={11} /> Retirer</button>
        </div>
      </div>
      <div className="grid grid-cols-[140px_1fr_auto] gap-x-3 gap-y-1.5 mt-3 text-[11.5px]">
        <span className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">CNAME &mdash; nom</span>
        <code className="font-mono text-gray-700">{domain.hostname}</code>
        <button type="button" onClick={() => copy(domain.hostname, 'Hostname')} className="text-gray-400 hover:text-gray-700"><Copy size={11} /></button>
        <span className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">CNAME &mdash; valeur</span>
        <code className="font-mono text-gray-700">{TENANT_TARGET}</code>
        <button type="button" onClick={() => copy(TENANT_TARGET, 'Cible CNAME')} className="text-gray-400 hover:text-gray-700"><Copy size={11} /></button>
        <span className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">TXT &mdash; nom</span>
        <code className="font-mono text-gray-700">_gestu-verify.{domain.hostname}</code>
        <button type="button" onClick={() => copy(`_gestu-verify.${domain.hostname}`, 'TXT host')} className="text-gray-400 hover:text-gray-700"><Copy size={11} /></button>
        <span className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">TXT &mdash; valeur</span>
        <code className="font-mono text-gray-700 break-all">{domain.verification_token}</code>
        <button type="button" onClick={() => copy(domain.verification_token, 'Token')} className="text-gray-400 hover:text-gray-700"><Copy size={11} /></button>
      </div>
      {domain.last_error && (
        <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-[11.5px] text-red-700">
          <b>Dernière erreur :</b> {domain.last_error}
        </div>
      )}
    </div>
  )
}
