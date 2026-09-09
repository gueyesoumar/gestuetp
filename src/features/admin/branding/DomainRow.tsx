import { RefreshCw, Trash2, CheckCircle2, AlertCircle, Copy, RotateCw } from 'lucide-react'
import { useToast } from '../../../hooks/useToast'
import type { CabinetDomainRow } from './useCabinetBrandingAdmin'

const TENANT_TARGET = (import.meta.env.VITE_TENANT_CNAME_TARGET as string | undefined) ?? 'tenants.gestugroup.com'

interface Props {
  domain: CabinetDomainRow
  isLast: boolean
  onVerify: () => void
  onRemove: () => void
  onReprovision: () => void
  busy: boolean
}

function StatusPill({ ok, label }: { ok: boolean; label: string }): JSX.Element {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold ${ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
      {ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />} {label}
    </span>
  )
}

export function DomainRow({ domain, isLast, onVerify, onRemove, onReprovision, busy }: Props): JSX.Element {
  const toast = useToast()
  const provisioned = domain.vercel_registered && domain.dns_provisioned
  const copyToken = (): void => {
    void navigator.clipboard.writeText(domain.verification_token)
    toast.success('Token copié')
  }

  return (
    <div className={`px-4 py-4 ${!isLast ? 'border-b border-gray-100' : ''}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-mono text-[13px] font-bold text-gray-900">{domain.hostname}</span>
        {domain.is_verified
          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10.5px] font-bold"><CheckCircle2 size={11} /> Vérifié</span>
          : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10.5px] font-bold"><AlertCircle size={11} /> En attente</span>}
        <StatusPill ok={domain.vercel_registered} label="Vercel" />
        <StatusPill ok={domain.dns_provisioned} label="DNS" />
        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${domain.ssl_status === 'issued' ? 'bg-green-50 text-green-700' : domain.ssl_status === 'error' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500'}`}>SSL : {domain.ssl_status}</span>
        <div className="ml-auto flex items-center gap-1">
          {!provisioned && (
            <button onClick={onReprovision} disabled={busy} className="inline-flex items-center gap-1 px-2 py-1 border border-forest-300 bg-white text-forest-700 rounded text-[11px] font-semibold hover:bg-forest-50 disabled:opacity-50"><RotateCw size={11} className={busy ? 'animate-spin' : ''} /> Ré-enregistrer</button>
          )}
          <button onClick={onVerify} disabled={busy} className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 bg-white text-gray-700 rounded text-[11px] font-semibold hover:bg-gray-50 disabled:opacity-50"><RefreshCw size={11} className={busy ? 'animate-spin' : ''} /> Vérifier</button>
          <button onClick={onRemove} disabled={busy} className="inline-flex items-center gap-1 px-2 py-1 border border-red-200 bg-white text-red-700 rounded text-[11px] font-semibold hover:bg-red-50 disabled:opacity-50"><Trash2 size={11} /> Retirer</button>
        </div>
      </div>

      <p className="mt-2.5 text-[11px] text-gray-500">
        Configuration automatique : <code className="font-mono text-gray-700">CNAME → {TENANT_TARGET}</code> + <code className="font-mono text-gray-700">TXT _gestu-verify.{domain.hostname}</code>
        <button type="button" onClick={copyToken} className="ml-1.5 align-middle text-gray-400 hover:text-gray-700"><Copy size={11} /></button>
      </p>

      {domain.provision_error && (
        <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-[11.5px] text-amber-800">
          <b>Provisionnement :</b> {domain.provision_error}
        </div>
      )}
      {domain.last_error && (
        <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-[11.5px] text-red-700">
          <b>Dernière vérification :</b> {domain.last_error}
        </div>
      )}
    </div>
  )
}
