import { useEffect, useState } from 'react'
import { X, ArrowUpRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { ScenarioFieldset, type ScenarioFields } from './ScenarioFieldset'
import type { MissionRisk, RiskCatalogEntry, RiskLevel, ScoreDimension } from '../../types/database.types'

// Cotation 4×4 de départ dérivée du niveau qualitatif du mission_risk (ajustable).
const LEVEL_TO_RATING: Record<RiskLevel, { l: number; i: number }> = {
  critical: { l: 4, i: 4 }, high: { l: 3, i: 3 }, medium: { l: 2, i: 2 }, low: { l: 1, i: 1 },
}

/** Promeut un risque de cadrage vers le registre Gëstu Risk de l'organisation auditée. */
export function PromoteRiskModal({ risk, onClose, onDone }: { risk: MissionRisk; onClose: () => void; onDone: () => void }): JSX.Element {
  const toast = useToast()
  const rating = LEVEL_TO_RATING[risk.risk_level]
  const [fields, setFields] = useState<ScenarioFields>({
    dimension: '', threat: '', feared: '', vulnerability: '', likelihood: rating.l, impact: rating.i,
  })
  const [catalog, setCatalog] = useState<RiskCatalogEntry[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const ac = new AbortController()
    supabase.from('risk_catalog').select('*').abortSignal(ac.signal)
      .then(({ data, error }) => {
        if (ac.signal.aborted) return
        if (error) { console.error('[PromoteRiskModal] catalog:', error.message); return }
        setCatalog((data ?? []) as RiskCatalogEntry[])
      })
    return () => ac.abort()
  }, [])

  const patch = (p: Partial<ScenarioFields>): void => setFields((f) => ({ ...f, ...p }))

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!fields.dimension) { toast.error('Dimension requise'); return }
    setBusy(true)
    const { error } = await supabase.rpc('promote_mission_risk', {
      p_mission_risk_id: risk.id,
      p_dimension: fields.dimension as ScoreDimension,
      p_likelihood: fields.likelihood,
      p_impact: fields.impact,
      p_vulnerability: fields.vulnerability || null,
      p_threat_ref: fields.threat || null,
      p_feared_event_ref: fields.feared || null,
    })
    setBusy(false)
    if (error) {
      console.error('[promote_mission_risk]', error.message)
      toast.error(error.message.includes('AAL2') ? 'Authentification renforcée (MFA) requise.' : 'Promotion impossible.')
      return
    }
    toast.success("Risque promu vers le registre de l'organisation auditée.")
    onDone()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><ArrowUpRight size={18} className="text-forest-700" /> Promouvoir vers le registre</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <div className="rounded-lg bg-forest-50 border border-forest-100 px-3 py-2">
            <p className="text-[13px] font-semibold text-gray-900">{risk.title}</p>
            {risk.description && <p className="text-[12px] text-gray-500 mt-0.5">{risk.description}</p>}
          </div>
          <p className="text-[11px] text-gray-400">
            Le scénario rejoint le registre de <b>l&apos;organisation auditée</b> ; il y sera disponible quand elle activera Gëstu Risk. Complétez la dimension et ajustez la cotation.
          </p>
          <ScenarioFieldset value={fields} onChange={patch} catalog={catalog} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
              {busy ? 'Promotion…' : 'Promouvoir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
