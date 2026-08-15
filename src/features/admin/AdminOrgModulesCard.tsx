import { useState } from 'react'
import { Boxes } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { readInvokeError } from '../../lib/edgeError'
import { useToast } from '../../hooks/useToast'
import type { Capability } from '../../types/database.types'

// Modules Hub activables à la carte (RFC 0002). À étendre à mesure des livraisons.
const MODULES: Array<{ value: Capability; label: string; desc: string }> = [
  { value: 'risk', label: 'Risk — Gestion des risques', desc: 'Registre EBIOS RM, nœud papillon, alimente le score de confiance.' },
]

interface Props {
  cabinetId: string
  current: Capability[]
  onSaved: () => void
}

/** Sélecteur super-admin des modules Hub à la carte d'une organisation (RFC 0002).
 *  Motif obligatoire, journalisé. Écriture via Edge Function (service_role). */
export function AdminOrgModulesCard({ cabinetId, current, onSaved }: Props): JSX.Element {
  const toast = useToast()
  const initial = new Set(current.filter((c) => MODULES.some((m) => m.value === c)))
  const [enabled, setEnabled] = useState<Set<Capability>>(initial)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const changed = MODULES.filter((m) => enabled.has(m.value) !== initial.has(m.value))
  const dirty = changed.length > 0

  const toggle = (cap: Capability): void => setEnabled((s) => {
    const next = new Set(s)
    next.has(cap) ? next.delete(cap) : next.add(cap)
    return next
  })

  const save = async (): Promise<void> => {
    if (!dirty || !reason.trim()) return
    setSaving(true)
    for (const m of changed) {
      const { data, error } = await supabase.functions.invoke('admin-set-org-capability', {
        body: { organization_id: cabinetId, capability: m.value, enabled: enabled.has(m.value), reason },
      })
      if (error || (data as { error?: string })?.error) {
        setSaving(false)
        toast.error('Changement impossible', await readInvokeError(error, data, 'Erreur'))
        return
      }
    }
    setSaving(false)
    toast.success('Modules mis à jour')
    setReason('')
    onSaved()
  }

  const field = 'px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700'

  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <Boxes size={16} className="text-forest-700" />
        <h3 className="text-[14px] font-bold text-gray-900">Modules Hub</h3>
      </div>
      <p className="text-[12px] text-gray-500 mb-4">
        Active/d&eacute;sactive les modules <strong>&agrave; la carte</strong> de cette organisation. Les modules structurels (Comply, Regul) restent d&eacute;termin&eacute;s par l&apos;&eacute;dition.
      </p>

      <div className="space-y-2">
        {MODULES.map((m) => (
          <label key={m.value} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50">
            <input type="checkbox" checked={enabled.has(m.value)} onChange={() => toggle(m.value)} className="mt-0.5 accent-forest-700" />
            <span>
              <span className="block text-[13px] font-semibold text-gray-900">{m.label}</span>
              <span className="block text-[11.5px] text-gray-500">{m.desc}</span>
            </span>
          </label>
        ))}
      </div>

      {dirty && (
        <div className="mt-3">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Motif <span className="text-red-500">*</span></label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Pourquoi ce changement ?" className={`w-full ${field}`} />
        </div>
      )}

      <button
        onClick={() => void save()}
        disabled={!dirty || !reason.trim() || saving}
        className="mt-3 px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50"
      >
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  )
}
