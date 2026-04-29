import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { ORG_TYPE_OPTIONS } from '../../lib/constants'

interface Props {
  organizationId: string
  organizationName: string
  currentTypes: string[]
  onClose: () => void
  onSuccess: () => void
}

export function EditOrganizationTypesModal({ organizationId, organizationName, currentTypes, onClose, onSuccess }: Props): JSX.Element {
  const toast = useToast()
  const [types, setTypes] = useState<string[]>(currentTypes.filter((t) => t !== 'platform'))
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isPlatform = currentTypes.includes('platform')
  const noChange = sameSet(types, currentTypes.filter((t) => t !== 'platform'))
  const canSubmit = !submitting && !isPlatform && reason.trim().length > 0 && types.length > 0 && !noChange

  const toggle = (value: string) => {
    setTypes((prev) => prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value])
  }

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-organization', {
        body: { organization_id: organizationId, types, reason: reason.trim() },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      toast.success('Types mis à jour', { description: organizationName })
      onSuccess()
      onClose()
    } catch (err) {
      toast.error('Mise à jour impossible', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-[14.5px] font-bold text-gray-900">Modifier les types &mdash; {organizationName}</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          {isPlatform && (
            <div className="rounded-lg bg-purple-50 border border-purple-200 p-3 text-[12px] text-purple-800">
              Cette organisation est de type <b>Plateforme</b> (super-admin G&euml;stu). Les types ne peuvent pas &ecirc;tre modifi&eacute;s via cette interface.
            </div>
          )}
          <div>
            <span className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Types</span>
            <div className="space-y-2">
              {ORG_TYPE_OPTIONS.map((opt) => (
                <label key={opt.value} className={`flex items-center gap-2 text-[13px] ${isPlatform ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={types.includes(opt.value)}
                    onChange={() => toggle(opt.value)}
                    disabled={submitting || isPlatform}
                    className="rounded border-gray-300 accent-forest-700"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {types.length === 0 && !isPlatform && (
              <p className="mt-2 text-[11px] text-red-600">Au moins un type est requis.</p>
            )}
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
              Motif <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Pourquoi cette modification ? (obligatoire)"
              rows={3}
              disabled={submitting || isPlatform}
              className="w-full"
            />
            <p className="mt-2 text-[11px] text-gray-400">Le motif est trac&eacute; dans l&apos;audit log et conserv&eacute; ind&eacute;finiment.</p>
          </div>
        </div>
        <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} disabled={submitting} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg text-white bg-forest-700 hover:bg-forest-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'En cours…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((v, i) => v === sb[i])
}
