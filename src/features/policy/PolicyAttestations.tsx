import { useState } from 'react'
import { Check, ShieldCheck } from 'lucide-react'
import { usePolicyAttestations } from './usePolicyAttestations'
import { POLICY_EFFECTIVENESS_STATUS } from '../../lib/constants'
import type { Policy, PolicyEffectivenessStatus } from '../../types/database.types'

const EFF_COLOR: Record<PolicyEffectivenessStatus, string> = { applied: '#2E9E6B', partial: '#B8891F', not_verified: '#94A3B8' }
const effLabel = (v: string): string => POLICY_EFFECTIVENESS_STATUS.find((s) => s.value === v)?.label ?? v
const fmt = (iso: string | null): string => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export function PolicyAttestations({ policy, versionId, onChanged }: { policy: Policy; versionId: string | null; onChanged: () => void }): JSX.Element {
  const att = usePolicyAttestations(policy.id, versionId)
  const [status, setStatus] = useState<PolicyEffectivenessStatus>('applied')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const rate = att.eligible > 0 ? Math.round((att.ackCount / att.eligible) * 100) : 0

  const submit = async (): Promise<void> => {
    setBusy(true)
    await att.attestEffective({ status, note, file, reviewMonths: policy.review_period_months })
    setBusy(false); setNote(''); setFile(null); onChanged()
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* Adoption / lecture */}
      <div className="rounded-xl border border-gray-200 p-3">
        <div className="text-[10px] font-mono uppercase tracking-wide text-gray-400 mb-2">Adoption · lecture</div>
        <div className="flex items-baseline gap-1.5"><span className="text-2xl font-bold text-gray-900">{rate}%</span>
          <span className="text-[11px] text-gray-400 font-mono">{att.ackCount}/{att.eligible} attesté</span></div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden mt-2"><div className="h-full rounded-full bg-[#1B4332]" style={{ width: `${rate}%` }} /></div>
        {att.acked
          ? <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-forest-700"><Check size={14} /> Vous avez attesté</p>
          : <button onClick={() => void att.acknowledge().then(onChanged)} disabled={!versionId}
              className="mt-3 w-full px-3 py-2 text-[12px] font-semibold text-white bg-[#1B4332] rounded-lg hover:brightness-125 disabled:opacity-50">
              J&apos;atteste avoir lu la politique
            </button>}
      </div>

      {/* Application effective */}
      <div className="rounded-xl border border-gray-200 p-3">
        <div className="text-[10px] font-mono uppercase tracking-wide text-gray-400 mb-2">Application effective</div>
        {att.latestEffective ? (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: EFF_COLOR[att.latestEffective.status] }}>
              ● {effLabel(att.latestEffective.status)}</span>
            <div className="text-[11px] text-gray-400 font-mono mt-1">attestée {fmt(att.latestEffective.attested_at)} · prochaine {fmt(att.latestEffective.next_due)}</div>
          </div>
        ) : <p className="text-[12px] text-gray-400 mb-2">Non encore attestée.</p>}

        <select value={status} onChange={(e) => setStatus(e.target.value as PolicyEffectivenessStatus)}
          className="w-full text-[12px] border border-gray-300 rounded-lg px-2 py-1.5 mb-2">
          {POLICY_EFFECTIVENESS_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Preuve / note (ex. échantillon de revue)"
          className="w-full text-[12px] border border-gray-300 rounded-lg px-2 py-1.5 mb-2" />
        <input type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-[11px] text-gray-500 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-gray-700 mb-2" />
        <button onClick={() => void submit()} disabled={busy}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-white bg-[#6D5AE6] rounded-lg hover:brightness-110 disabled:opacity-50">
          <ShieldCheck size={14} /> {busy ? 'Attestation…' : "Attester l'application"}
        </button>
        <p className="text-[10px] text-gray-400 mt-2 leading-snug">« Appliquée » fait passer la politique en <b>preuve forte</b> pour les contrôles liés.</p>
      </div>
    </div>
  )
}
