import { useEffect, useState } from 'react'
import { X, ArrowUpRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { ScenarioFieldset, type ScenarioFields } from './ScenarioFieldset'
import type { RiskCatalogEntry } from '../../types/database.types'

interface Props {
  subject: { title: string; description: string | null }
  initial: ScenarioFields
  /** Si vrai, la dimension peut rester vide (dérivée serveur, ex. depuis le contrôle). */
  dimensionOptional?: boolean
  note?: string
  /** Exécute la promotion ; retourne un message d'erreur, ou null si succès. */
  onSubmit: (fields: ScenarioFields) => Promise<string | null>
  onDone: () => void
  onClose: () => void
}

/** Modale générique de promotion d'un risque vers le registre Gëstu Risk de l'org auditée. */
export function PromoteToRegisterModal({ subject, initial, dimensionOptional, note, onSubmit, onDone, onClose }: Props): JSX.Element {
  const toast = useToast()
  const [fields, setFields] = useState<ScenarioFields>(initial)
  const [catalog, setCatalog] = useState<RiskCatalogEntry[]>([])
  const [busy, setBusy] = useState(false)

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
    const err = await onSubmit(fields)
    setBusy(false)
    if (err) {
      toast.error(err.includes('AAL2') ? 'Authentification renforcée (MFA) requise.' : 'Promotion impossible.')
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
              {busy ? 'Promotion…' : 'Promouvoir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
