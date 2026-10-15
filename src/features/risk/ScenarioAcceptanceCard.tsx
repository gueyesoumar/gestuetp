import { useState } from 'react'
import { ShieldCheck, Lock, AlertTriangle } from 'lucide-react'
import { useRiskAcceptance } from './useRiskAcceptance'
import { useRiskCriteria } from './useRiskCriteria'
import { useCabinetPermissions } from '../../hooks/useCabinetPermissions'
import { useToast } from '../../hooks/useToast'
import type { RiskAcceptanceStatus } from '../../types/database.types'

const statusCfg: Record<RiskAcceptanceStatus, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-green-50 text-green-700' },
  expired: { label: 'Expirée', cls: 'bg-amber-50 text-amber-700' },
  revoked: { label: 'Révoquée', cls: 'bg-gray-100 text-gray-500' },
  superseded: { label: 'Invalidée', cls: 'bg-red-50 text-red-700' },
}

/** Acceptation formelle du risque résiduel (RFC 0017 Lot 3). */
export function ScenarioAcceptanceCard({ scenarioId, residual }: { scenarioId: string; residual: number }): JSX.Element {
  const { acceptance, accept, revoke } = useRiskAcceptance(scenarioId)
  const { acceptanceThreshold } = useRiskCriteria()
  const { canAcceptRisk } = useCabinetPermissions()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [justif, setJustif] = useState('')
  const [until, setUntil] = useState('')
  const [busy, setBusy] = useState(false)

  const aboveThreshold = residual > acceptanceThreshold
  const active = acceptance && acceptance.status === 'active'

  const submit = async (): Promise<void> => {
    setBusy(true)
    const res = await accept({
      residual_level: residual,
      justification: justif.trim() || null,
      valid_until: until || null,
      is_derogation: aboveThreshold,
    })
    setBusy(false)
    if (res.ok) { toast.success('Risque accepté'); setOpen(false); setJustif(''); setUntil('') }
    else toast.error('Acceptation impossible', { description: res.error })
  }

  return (
    <div className="px-5 pb-5 border-t border-gray-100 pt-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck size={14} className="text-forest-700" />
        <h4 className="text-[12px] font-bold uppercase tracking-wide text-gray-500">Acceptation du risque</h4>
        {acceptance && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${statusCfg[acceptance.status].cls}`}>{statusCfg[acceptance.status].label}</span>}
      </div>

      {active ? (
        <div className="text-[12px] text-gray-700 space-y-1">
          <div>Résiduel accepté : <b>{acceptance!.residual_level}</b>{acceptance!.is_derogation && <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">dérogatoire</span>}</div>
          <div className="text-gray-500">Accepté le {acceptance!.accepted_at.slice(0, 10)}{acceptance!.valid_until ? ` · valable jusqu'au ${acceptance!.valid_until}` : ''}</div>
          {acceptance!.justification && <div className="text-gray-500 italic">« {acceptance!.justification} »</div>}
          {canAcceptRisk && <button onClick={() => void revoke(acceptance!.id)} className="mt-1 text-[12px] text-red-600 hover:underline">Révoquer l'acceptation</button>}
        </div>
      ) : !canAcceptRisk ? (
        <div className="flex items-center gap-2 text-[12px] text-gray-500"><Lock size={13} /> Permission <span className="font-mono">can_accept_risk</span> requise pour accepter ce risque.</div>
      ) : (
        <div className="text-[12px]">
          {aboveThreshold && (
            <div className="flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>Résiduel ({residual}) au-dessus du seuil ({acceptanceThreshold}) : acceptation <b>dérogatoire</b> seulement, justification obligatoire.</span>
            </div>
          )}
          {!open ? (
            <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900">
              {aboveThreshold ? 'Acceptation dérogatoire...' : 'Accepter le risque'}
            </button>
          ) : (
            <div className="space-y-2">
              <textarea value={justif} onChange={(e) => setJustif(e.target.value)} rows={2}
                placeholder={aboveThreshold ? 'Justification de la dérogation (obligatoire)' : 'Justification (facultative)'}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px]" />
              <div className="flex items-center gap-2">
                <label className="text-gray-500">Valable jusqu'au</label>
                <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-[12px]" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => void submit()} disabled={busy || (aboveThreshold && !justif.trim())}
                  className="px-3 py-1.5 text-[12px] font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">Confirmer l'acceptation</button>
                <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-[12px] text-gray-500">Annuler</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
