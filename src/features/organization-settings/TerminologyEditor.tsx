import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { readInvokeError } from '../../lib/edgeError'
import { vocabForPersona } from '../../lib/product'
import { EDITABLE_VOCAB_KEYS, VOCAB_GROUPS, type VocabKeyDef, type VocabGroupId } from '../../lib/vocab-keys'
import { useToast } from '../../hooks/useToast'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { TerminologyPreview } from './TerminologyPreview'

interface TerminologyEditorProps {
  /** Org cible (mode super-admin). Omis = propre org de l'appelant. */
  orgId?: string
}

/**
 * Éditeur de terminologie par org (RFC 0002). Mise en page « nav + panneau +
 * aperçu live » : familles à gauche, champs de la famille au centre, aperçu des
 * libellés en situation à droite. Écriture via l'edge manage-org-vocab.
 */
export function TerminologyEditor({ orgId }: TerminologyEditorProps): JSX.Element {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [persona, setPersona] = useState<'comply' | 'regul'>('comply')
  const [values, setValues] = useState<Record<string, string>>({})
  const [active, setActive] = useState<VocabGroupId>('entity')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let on = true
    void (async () => {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('manage-org-vocab', { body: { action: 'get', org_id: orgId } })
      if (!on) return
      if (error) { toast.error(await readInvokeError(error, data, 'Chargement impossible')); setLoading(false); return }
      const res = data as { persona?: string; overrides?: Record<string, string> }
      setPersona(res.persona === 'regul' ? 'regul' : 'comply'); setValues(res.overrides ?? {}); setLoading(false)
    })()
    return () => { on = false }
  }, [orgId])

  const defaults = vocabForPersona(persona === 'regul')
  const byKey = useMemo(() => new Map(EDITABLE_VOCAB_KEYS.map((k) => [k.key, k])), [])
  const get = (key: string): string => (values[key]?.trim() || String(defaults[byKey.get(key)!.field]))
  const customCount = (g: VocabGroupId) => EDITABLE_VOCAB_KEYS.filter((k) => k.group === g && (values[k.key] ?? '').trim() !== '').length
  const dirtyTotal = EDITABLE_VOCAB_KEYS.filter((k) => (values[k.key] ?? '').trim() !== '').length

  const q = search.trim().toLowerCase()
  const shown = q
    ? EDITABLE_VOCAB_KEYS.filter((k) => (k.label + ' ' + k.key).toLowerCase().includes(q))
    : EDITABLE_VOCAB_KEYS.filter((k) => k.group === active)

  async function invoke(action: 'set' | 'reset'): Promise<boolean> {
    setSaving(true)
    const { data, error } = await supabase.functions.invoke('manage-org-vocab', { body: { action, org_id: orgId, overrides: values } })
    setSaving(false)
    if (error) { toast.error(await readInvokeError(error, data, 'Action impossible')); return false }
    return true
  }
  async function save() { if (await invoke('set')) toast.success('Terminologie enregistrée', { description: 'Rechargez la page pour voir l’effet.' }) }
  async function reset() { if (await invoke('reset')) { setValues({}); toast.success('Terminologie réinitialisée') } }

  if (loading) return <LoadingSpinner />

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden max-w-5xl">
      <div className="grid grid-cols-1 lg:grid-cols-[210px_minmax(0,1fr)_290px]">
        {/* Nav familles */}
        <aside className="border-b lg:border-b-0 lg:border-r border-gray-200 bg-page-bg p-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Rechercher un terme…"
            className="w-full mb-2.5 text-[12.5px] rounded-lg border border-gray-300 px-3 py-2" />
          {VOCAB_GROUPS.map((g) => {
            const n = customCount(g.id); const on = !q && g.id === active
            return (
              <button key={g.id} type="button" onClick={() => { setActive(g.id); setSearch('') }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-semibold transition-colors ${on ? 'bg-forest-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                <span>{g.icon}</span><span className="flex-1 text-left">{g.label}</span>
                {n > 0
                  ? <span className={`text-[10px] rounded-full px-1.5 ${on ? 'bg-white/25' : 'bg-gold-500 text-forest-900'}`}>{n}</span>
                  : <span className={`text-[11px] ${on ? 'text-white/70' : 'text-gray-300'}`}>{EDITABLE_VOCAB_KEYS.filter((k) => k.group === g.id).length}</span>}
              </button>
            )
          })}
        </aside>

        {/* Champs */}
        <div className="p-5 min-w-0">
          {!q && <p className="text-[12px] text-gray-500 mb-4">{VOCAB_GROUPS.find((g) => g.id === active)?.description} <span className="text-gray-400">Vide = valeur par défaut.</span></p>}
          <div className="grid gap-4">
            {shown.map((k) => <VocabField key={k.key} def={k} value={values[k.key] ?? ''} def0={String(defaults[k.field])}
              onChange={(v) => setValues((p) => ({ ...p, [k.key]: v }))} />)}
          </div>
        </div>

        {/* Aperçu live */}
        <div className="border-t lg:border-t-0 lg:border-l border-gray-200 bg-page-bg p-5">
          <TerminologyPreview group={q ? (shown[0]?.group ?? active) : active} get={get} />
        </div>
      </div>

      <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
        <button onClick={save} disabled={saving} className="rounded-lg bg-forest-700 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-forest-800 disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        <button onClick={reset} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-2 text-[12.5px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Réinitialiser</button>
        {dirtyTotal > 0 && <span className="ml-auto text-[12px] text-gray-500">{dirtyTotal} libellé{dirtyTotal > 1 ? 's' : ''} personnalisé{dirtyTotal > 1 ? 's' : ''}</span>}
      </div>
    </div>
  )
}

function VocabField({ def, value, def0, onChange }: { def: VocabKeyDef; value: string; def0: string; onChange: (v: string) => void }): JSX.Element {
  const filled = value.trim() !== ''
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={`voc-${def.key}`} className="text-[12.5px] font-medium text-gray-800">{def.label}</label>
        <code className="font-mono text-[10px] text-gray-400">{def.key}</code>
      </div>
      {def.type === 'gender' ? (
        <div className="inline-flex w-max overflow-hidden rounded-lg border border-gray-300">
          {(['m', 'f'] as const).map((g) => (
            <button key={g} type="button" onClick={() => onChange(g)}
              className={`px-4 py-2 text-[12.5px] font-medium ${(value || def0) === g ? 'bg-forest-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {g === 'm' ? 'Masculin' : 'Féminin'}
            </button>
          ))}
        </div>
      ) : (
        <input id={`voc-${def.key}`} type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={def0}
          className={`w-full rounded-lg border px-3 py-2 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-forest-500/20 ${filled ? 'border-forest-500' : 'border-gray-300 focus:border-forest-500'}`} />
      )}
      <span className="text-[10.5px] text-gray-400">Défaut : <b className="font-medium text-gray-500">{def.type === 'gender' ? (def0 === 'f' ? 'Féminin' : 'Masculin') : def0}</b>{def.hint ? ` · ${def.hint}` : ''}</span>
    </div>
  )
}
