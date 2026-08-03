import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { readInvokeError } from '../../lib/edgeError'
import { vocabForEdition } from '../../lib/product'
import { EDITABLE_VOCAB_KEYS } from '../../lib/vocab-keys'
import { useToast } from '../../hooks/useToast'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

interface TerminologyEditorProps {
  /** Org cible (mode super-admin). Omis = propre org de l'appelant (self-service). */
  orgId?: string
}

/**
 * Éditeur de terminologie par org (RFC 0002, P3a). Pose des overrides sur les
 * libellés que `useVocab` applique ; défaut résolu par l'édition. Écriture via
 * l'edge `manage-org-vocab` (autz : platform owner toute org / can_edit_organization
 * sa propre org). Les valeurs prennent effet au prochain rechargement.
 */
export function TerminologyEditor({ orgId }: TerminologyEditorProps): JSX.Element {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [edition, setEdition] = useState('comply')
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('manage-org-vocab', { body: { action: 'get', org_id: orgId } })
      if (!active) return
      if (error) { toast.error(await readInvokeError(error, data, 'Chargement impossible')); setLoading(false); return }
      const res = data as { edition?: string; overrides?: Record<string, string> }
      setEdition(res.edition ?? 'comply')
      setValues(res.overrides ?? {})
      setLoading(false)
    })()
    return () => { active = false }
  }, [orgId])

  const defaults = vocabForEdition(edition)

  async function invoke(action: 'set' | 'reset'): Promise<boolean> {
    setSaving(true)
    const { data, error } = await supabase.functions.invoke('manage-org-vocab', {
      body: { action, org_id: orgId, overrides: values },
    })
    setSaving(false)
    if (error) { toast.error(await readInvokeError(error, data, 'Action impossible')); return false }
    return true
  }

  async function save(): Promise<void> {
    if (await invoke('set')) toast.success('Terminologie enregistrée', { description: 'Rechargez la page pour voir l’effet.' })
  }
  async function reset(): Promise<void> {
    if (await invoke('reset')) { setValues({}); toast.success('Terminologie réinitialisée aux valeurs par défaut') }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-2xl">
      <p className="mb-4 text-sm text-gray-600">
        Personnalisez les mots que cette organisation voit sur la plateforme. Laissez un champ vide pour utiliser
        la valeur par d&eacute;faut. Le vocabulaire renomme&nbsp;; il ne change pas les modules disponibles.
      </p>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        {EDITABLE_VOCAB_KEYS.map((k) => (
          <div key={k.key} className="grid gap-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor={`voc-${k.key}`} className="text-sm font-medium text-gray-800">{k.label}</label>
              <code className="font-mono text-[11px] text-gray-400">{k.key}</code>
            </div>
            {k.type === 'gender' ? (
              <div className="inline-flex w-max overflow-hidden rounded-lg border border-gray-300">
                {(['m', 'f'] as const).map((g) => {
                  const current = values[k.key] || String(defaults[k.field])
                  return (
                    <button
                      key={g} type="button"
                      onClick={() => setValues((prev) => ({ ...prev, [k.key]: g }))}
                      className={`px-4 py-2 text-sm font-medium ${current === g ? 'bg-forest-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      {g === 'm' ? 'Masculin' : 'F&eacute;minin'}
                    </button>
                  )
                })}
              </div>
            ) : (
              <input
                id={`voc-${k.key}`}
                type="text"
                value={values[k.key] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [k.key]: e.target.value }))}
                placeholder={String(defaults[k.field])}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
              />
            )}
            <span className="text-[11px] text-gray-400">
              D&eacute;faut&nbsp;: <b className="font-medium text-gray-500">{k.type === 'gender' ? (String(defaults[k.field]) === 'f' ? 'Féminin' : 'Masculin') : String(defaults[k.field])}</b>
              {k.hint ? ` · ${k.hint}` : ''}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-800 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          onClick={reset}
          disabled={saving}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          R&eacute;initialiser
        </button>
      </div>
    </div>
  )
}
