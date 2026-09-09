import { useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { readInvokeError } from '../../../lib/edgeError'
import { useToast } from '../../../hooks/useToast'
import { DomainRow } from './DomainRow'
import { AddDomainModal } from './AddDomainModal'
import type { CabinetDomainRow } from './useCabinetBrandingAdmin'

interface Props {
  cabinetId: string
  domains: CabinetDomainRow[]
  onChanged: () => void
}

const ZONE = (import.meta.env.VITE_TENANT_ZONE as string | undefined) ?? 'gestugroup.com'
const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/

type Submitting = 'add' | { verify: string } | { remove: string } | { reprovision: string } | null

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export function DomainsSection({ cabinetId, domains, onChanged }: Props): JSX.Element {
  const [adding, setAdding] = useState(false)
  const [submitting, setSubmitting] = useState<Submitting>(null)
  const toast = useToast()

  // Vérif DNS silencieuse (sans prompt), utilisée par l'auto-poll post-création.
  const runVerify = async (domainId: string, r: string): Promise<boolean> => {
    const { data, error } = await supabase.functions.invoke('dns-verify-tenant', {
      body: { action: 'verify', cabinet_id: cabinetId, domain_id: domainId, reason: r },
    })
    if (error || data?.error) return false
    return Boolean(data.verified)
  }

  // La propagation DNS (TTL 60) prend quelques dizaines de secondes : on retente.
  const pollVerify = async (domainId: string): Promise<void> => {
    for (let i = 0; i < 3; i++) {
      await sleep(12000)
      if (await runVerify(domainId, 'Vérification automatique post-création')) {
        toast.success('Domaine vérifié et SSL émis')
        onChanged()
        return
      }
    }
    onChanged()
  }

  const submitAdd = async (rawHostname: string, reason: string): Promise<void> => {
    const h = rawHostname.trim().toLowerCase()
    if (!HOSTNAME_RE.test(h) || !h.endsWith(`.${ZONE}`) || h === ZONE) {
      toast.error(`Sous-domaine de ${ZONE} attendu (ex: client.${ZONE})`)
      return
    }
    if (!reason.trim()) return
    setSubmitting('add')
    const { data, error } = await supabase.functions.invoke('admin-cabinet-domain', {
      body: { action: 'add', cabinet_id: cabinetId, hostname: h, reason },
    })
    setSubmitting(null)
    if (error || data?.error) {
      toast.error(await readInvokeError(error, data, 'Création impossible'))
      return
    }
    const prov = data.domain as { id: string; provision_error: string | null }
    if (prov.provision_error) {
      toast.error('Provisionnement partiel', { description: prov.provision_error })
    } else {
      toast.success('Domaine ajouté et provisionné', { description: 'Vérification DNS en cours…' })
    }
    setAdding(false)
    onChanged()
    if (prov.id) void pollVerify(prov.id)
  }

  const verify = async (domain: CabinetDomainRow): Promise<void> => {
    const r = window.prompt('Motif de la vérification ?', 'Vérification DNS de routine')
    if (!r?.trim()) return
    setSubmitting({ verify: domain.id })
    const ok = await runVerify(domain.id, r)
    setSubmitting(null)
    if (ok) toast.success('Domaine vérifié et SSL émis')
    else toast.error('Vérification DNS échouée', { description: 'Voir le détail dans la liste' })
    onChanged()
  }

  const reprovision = async (domain: CabinetDomainRow): Promise<void> => {
    const r = window.prompt(`Motif pour ré-enregistrer ${domain.hostname} ?`, 'Nouvelle tentative de provisionnement')
    if (!r?.trim()) return
    setSubmitting({ reprovision: domain.id })
    const { data, error } = await supabase.functions.invoke('admin-cabinet-domain', {
      body: { action: 'reprovision', cabinet_id: cabinetId, domain_id: domain.id, reason: r },
    })
    setSubmitting(null)
    if (error || data?.error) {
      toast.error(await readInvokeError(error, data, 'Ré-enregistrement impossible'))
      return
    }
    const prov = data.provision as { provision_error: string | null }
    if (prov.provision_error) toast.error('Provisionnement partiel', { description: prov.provision_error })
    else toast.success('Domaine ré-enregistré')
    onChanged()
  }

  const remove = async (domain: CabinetDomainRow): Promise<void> => {
    const r = window.prompt(`Motif pour supprimer ${domain.hostname} ?`)
    if (!r?.trim()) return
    setSubmitting({ remove: domain.id })
    const { data, error } = await supabase.functions.invoke('admin-cabinet-domain', {
      body: { action: 'remove', cabinet_id: cabinetId, domain_id: domain.id, reason: r },
    })
    setSubmitting(null)
    if (error || data?.error) {
      toast.error(await readInvokeError(error, data, 'Suppression impossible'))
      return
    }
    toast.success('Domaine supprimé')
    onChanged()
  }

  const rowBusy = (id: string): boolean =>
    typeof submitting === 'object' && submitting !== null &&
    (('verify' in submitting && submitting.verify === id) ||
      ('remove' in submitting && submitting.remove === id) ||
      ('reprovision' in submitting && submitting.reprovision === id))

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
            <DomainRow key={d.id} domain={d} isLast={i === domains.length - 1} onVerify={() => verify(d)} onRemove={() => remove(d)} onReprovision={() => reprovision(d)} busy={rowBusy(d.id)} />
          ))}
        </div>
      )}

      {adding && (
        <AddDomainModal zone={ZONE} busy={submitting === 'add'} onCancel={() => setAdding(false)} onSubmit={submitAdd} />
      )}
    </div>
  )
}
