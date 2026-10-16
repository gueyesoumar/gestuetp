import { useEffect, useState } from 'react'
import { X, ArrowUpRight, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { useSupervisorDirectives } from './useSupervisorDirectives'
import { ScenarioFieldset, type ScenarioFields } from './ScenarioFieldset'
import type { RiskCatalogEntry } from '../../types/database.types'

interface Props {
  subject: { title: string; description: string | null }
  initial: ScenarioFields
  /** Si vrai, la dimension peut rester vide (dérivée serveur, ex. depuis le contrôle). */
  dimensionOptional?: boolean
  /** Si vrai, propose d'enchaîner sur une demande d'action (contexte superviseur). */
  allowDirective?: boolean
  note?: string
  /** Exécute la promotion ; retourne { error, scenarioId }. */
  onSubmit: (fields: ScenarioFields) => Promise<{ error: string | null; scenarioId?: string }>
  onDone: () => void
  onClose: () => void
}

/** Modale générique de promotion d'un risque vers le registre Gëstu Risk de l'org auditée. */
export function PromoteToRegisterModal({ subject, initial, dimensionOptional, allowDirective, note, onSubmit, onDone, onClose }: Props): JSX.Element {
  const toast = useToast()
  const dir = useSupervisorDirectives()
  const [fields, setFields] = useState<ScenarioFields>(initial)
  const [catalog, setCatalog] = useState<RiskCatalogEntry[]>([])
  const [busy, setBusy] = useState(false)
  const [promotedId, setPromotedId] = useState<string | null>(null)
  const [actionDesc, setActionDesc] = useState('')
  const [actionDue, setActionDue] = useState('')

  useEffect(() => {
    const ac = new AbortController()
    supabase.from('risk_catalog').select('*').abortSignal(ac.signal)
      .then(({ data, error }) => {
        if (ac.signal.aborted) return
        if (error) { console.error('[PromoteToRegisterModal] catalog:', error.message); return }
        setCatalog((data ?? []) as RiskCatalogEntry[])
      })
    return () => ac.abort()
  }, [])

  const patch = (p: Partial<ScenarioFields>): void => setFields((f) => ({ ...f, ...p }))

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!dimensionOptional && !fields.dimension) { toast.error('Dimension requise'); return }
    setBusy(true)
    const res = await onSubmit(fields)
    setBusy(false)
    if (res.error) {
      toast.error(res.error.includes('AAL2') ? 'Authentification renforcée (MFA) requise.' : 'Promotion impossible.')
      return
    }
    toast.success("Risque promu vers le registre de l'organisation auditée.")
    onDone()
    if (allowDirective && res.scenarioId) { setPromotedId(res.scenarioId); setActionDesc(subject.title) }
    else onClose()
  }

  const sendDirective = async (): Promise<void> => {
    if (!promotedId || !actionDesc.trim()) return
    setBusy(true)
    const r = await dir.request(promotedId, actionDesc.trim(), actionDue || null)
    setBusy(false)
    if (r.ok) { toast.success("Action de traitement demandée à l'assujetti."); onClose() }
    else toast.error('Demande impossible.')
  }

  const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700'
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><ArrowUpRight size={18} className="text-forest-700" /> {promotedId ? 'Demander une action' : 'Promouvoir vers le registre'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {promotedId ? (
          <div className="px-5 py-4 space-y-3">
            <p className="text-[12px] text-gray-500">Le scénario est dans le registre de l&rsquo;assujetti. Vous pouvez lui demander une action de traitement (facultatif).</p>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Action demandée</label>
              <textarea rows={3} value={actionDesc} onChange={(e) => setActionDesc(e.target.value)} className={field} placeholder="ex. Déployer la MFA sur les comptes à privilèges" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Échéance <span className="font-normal text-gray-400">(optionnel)</span></label>
              <input type="date" value={actionDue} onChange={(e) => setActionDue(e.target.value)} className={`${field} w-48`} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Terminer</button>
              <button onClick={sendDirective} disabled={busy || !actionDesc.trim()} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50"><Send size={15} /> Demander</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="px-5 py-4 space-y-3">
            <div className="rounded-lg bg-forest-50 border border-forest-100 px-3 py-2">
              <p className="text-[13px] font-semibold text-gray-900">{subject.title}</p>
              {subject.description && <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-3">{subject.description}</p>}
            </div>
            <p className="text-[11px] text-gray-400">
              Le scénario rejoint le registre de <b>l&apos;organisation auditée</b> ; il y sera disponible quand elle activera Gëstu Risk.{note ? ` ${note}` : ''}
            </p>
            <ScenarioFieldset value={fields} onChange={patch} catalog={catalog} />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button type="submit" disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
                {busy ? 'Promotion...' : 'Promouvoir'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
