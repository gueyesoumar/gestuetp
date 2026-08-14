import { useState } from 'react'
import { Cog } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { readInvokeError } from '../../lib/edgeError'
import { useToast } from '../../hooks/useToast'
import { WORKFLOW_ENGINE_OPTIONS, type WorkflowVersion } from '../../lib/constants'

interface Props {
  cabinetId: string
  currentEngine: WorkflowVersion
  onSaved: () => void
}

/** Sélecteur super-admin du moteur de mission d'une organisation (RFC 0003).
 *  Attribution libre et symétrique ; motif obligatoire, journalisé. */
export function AdminOrgEngineCard({ cabinetId, currentEngine, onSaved }: Props): JSX.Element {
  const toast = useToast()
  const [engine, setEngine] = useState<WorkflowVersion>(currentEngine)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const dirty = engine !== currentEngine

  const save = async (): Promise<void> => {
    if (!dirty || !reason.trim()) return
    setSaving(true)
    const { data, error } = await supabase.functions.invoke('admin-set-org-engine', {
      body: { organization_id: cabinetId, workflow_version: engine, reason },
    })
    setSaving(false)
    if (error || (data as { error?: string })?.error) {
      toast.error('Changement impossible', await readInvokeError(error, data, 'Erreur'))
      return
    }
    toast.success('Moteur de mission mis à jour')
    setReason('')
    onSaved()
  }

  const field = 'px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700'

  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <Cog size={16} className="text-forest-700" />
        <h3 className="text-[14px] font-bold text-gray-900">Moteur de mission</h3>
      </div>
      <p className="text-[12px] text-gray-500 mb-4">
        D&eacute;termine les &eacute;tapes du cycle de vie des <strong>nouvelles</strong> missions de cette organisation. Les missions en cours ne sont pas impact&eacute;es (moteur fig&eacute; &agrave; la cr&eacute;ation).
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Moteur</label>
          <select value={engine} onChange={(e) => setEngine(e.target.value as WorkflowVersion)} className={field}>
            {WORKFLOW_ENGINE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {dirty && (
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Motif <span className="text-red-500">*</span></label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Pourquoi ce changement ?" className={`w-full ${field}`} />
          </div>
        )}
        <button
          onClick={() => void save()}
          disabled={!dirty || !reason.trim() || saving}
          className="px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
