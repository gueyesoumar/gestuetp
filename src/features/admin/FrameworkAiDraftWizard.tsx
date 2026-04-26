import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, FileText, X, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'

interface DraftDomain {
  code: string
  name: string
  description?: string
  controls: Array<{ code: string; name: string; description?: string; guidance?: string }>
}

interface Draft {
  name: string
  slug: string
  version: string | null
  publisher: string | null
  category: string
  domains: DraftDomain[]
}

interface Props {
  onClose: () => void
  onCreated?: () => void
}

const MAX_FILES = 5
const MAX_FILE_SIZE = 32 * 1024 * 1024

export function FrameworkAiDraftWizard({ onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [version, setVersion] = useState('')
  const [publisher, setPublisher] = useState('')
  const [category, setCategory] = useState('conformite')
  const [instructions, setInstructions] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [tokens, setTokens] = useState<{ input: number; output: number } | null>(null)
  const [persisting, setPersisting] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    if (slugTouched) return
    const auto = name.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
    setSlug(auto)
  }, [name, slugTouched])

  const slugValid = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/.test(slug)
  const step1Valid = name.trim().length >= 2 && slugValid

  const onFilesPicked = (picked: FileList | null) => {
    if (!picked) return
    const next = [...files]
    for (const f of Array.from(picked)) {
      if (next.length >= MAX_FILES) { toast.warn(`Maximum ${MAX_FILES} fichiers`); break }
      if (f.size > MAX_FILE_SIZE) { toast.warn(`${f.name} dépasse 32 Mo`); continue }
      next.push(f)
    }
    setFiles(next)
  }

  const removeFile = (idx: number) => {
    setFiles(files.filter((_, i) => i !== idx))
  }

  const totalSize = files.reduce((s, f) => s + f.size, 0)
  const sizeLabel = totalSize < 1_048_576 ? `${(totalSize / 1024).toFixed(0)} Ko` : `${(totalSize / 1_048_576).toFixed(1)} Mo`
  const estimatedCost = estimateCost(files, instructions)

  const generate = async () => {
    setGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { toast.error('Non authentifié'); setGenerating(false); return }

      const fd = new FormData()
      fd.append('brief', JSON.stringify({ name, slug, version, publisher, category, instructions }))
      for (const f of files) fd.append('file', f, f.name)

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-framework-ai-draft`
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        toast.error('Génération échouée', errBody.error ?? `${res.status}`)
        setGenerating(false)
        return
      }

      const result = await res.json() as { draft: Draft; tokens: { input: number; output: number } }
      setDraft(result.draft)
      setTokens(result.tokens)
      setStep(3)
    } catch (err) {
      toast.error('Génération échouée', err)
    } finally {
      setGenerating(false)
    }
  }

  const persist = async () => {
    if (!draft) return
    setPersisting(true)

    // 1. Créer le framework
    const { data: fwData, error: fwError } = await supabase.functions.invoke('admin-framework', {
      body: {
        action: 'create_framework',
        name: draft.name, slug: draft.slug, version: draft.version, publisher: draft.publisher,
        category: draft.category, was_ai_generated: true,
      },
    })
    if (fwError || fwData?.error) {
      toast.error('Création impossible', fwData?.error ?? fwError)
      setPersisting(false)
      return
    }
    const frameworkId = fwData.framework.id as string

    // 2. Pour chaque domaine, le créer puis créer les contrôles
    let createdDomains = 0
    let createdControls = 0
    for (const d of draft.domains) {
      const { data: dData, error: dError } = await supabase.functions.invoke('admin-framework', {
        body: { action: 'create_domain', framework_id: frameworkId, code: d.code, name: d.name, description: d.description ?? null },
      })
      if (dError || dData?.error) {
        console.error('domain create:', dError ?? dData?.error)
        continue
      }
      createdDomains++
      const domainId = dData.domain.id as string

      for (const c of (d.controls ?? [])) {
        const { data: cData, error: cError } = await supabase.functions.invoke('admin-framework', {
          body: { action: 'create_control', domain_id: domainId, code: c.code, name: c.name, description: c.description ?? null, guidance: c.guidance ?? null },
        })
        if (cError || cData?.error) {
          console.error('control create:', cError ?? cData?.error)
          continue
        }
        createdControls++
      }
    }

    setPersisting(false)
    toast.success('Référentiel créé', { description: `${createdDomains} domaines, ${createdControls} contrôles` })
    onClose()
    onCreated?.()
    navigate(`/admin/frameworks/${draft.slug}`)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3">
          <Sparkles size={16} className="text-gold-500" />
          <h3 className="text-[14.5px] font-bold text-gray-900">Générer un référentiel avec l&apos;IA</h3>
          <span className="ml-auto text-[11px] text-gray-400 font-mono">Étape {step} / 3</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="px-5 py-4 space-y-3">
              <p className="text-[12px] text-gray-500">Renseignez l&apos;identité du référentiel à créer.</p>
              <Field label="Nom *">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ISO 27001:2022 / PSSI-ES Sénégal / etc." disabled={generating} />
              </Field>
              <Field label="Slug *">
                <input type="text" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true) }} placeholder="iso-27001-2022" disabled={generating} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Version">
                  <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="2022" />
                </Field>
                <Field label="Publisher">
                  <input type="text" value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="ISO" />
                </Field>
              </div>
              <Field label="Catégorie">
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="conformite">Conformité</option>
                  <option value="gouvernance">Gouvernance</option>
                  <option value="evaluation">Évaluation</option>
                </select>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="px-5 py-4 space-y-3">
              <p className="text-[12px] text-gray-500">
                Joignez 0 à 5 PDFs (norme officielle, document métier, brouillon interne…). L&apos;IA s&apos;appuiera dessus
                pour produire la structure. Sans fichier, elle propose un squelette à partir du nom et des instructions.
              </p>
              <Field label="Instructions (optionnel)">
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  placeholder="Ex: 'Extraire uniquement la section 5 du PDF', 'Adapter au contexte des PMI africaines', 'Garder les codes originaux ISO'"
                  maxLength={4000}
                />
                <p className="text-[10.5px] text-gray-400 mt-1">{instructions.length} / 4000</p>
              </Field>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Documents source ({files.length}/5)</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl px-4 py-5 text-center bg-page-bg hover:border-forest-300 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.html"
                    onChange={(e) => { onFilesPicked(e.target.files); e.target.value = '' }}
                    style={{ display: 'none' }}
                    id="ai-draft-files"
                  />
                  <label htmlFor="ai-draft-files" className="cursor-pointer text-[12.5px] text-forest-700 font-semibold">
                    Cliquez pour ajouter des PDFs
                  </label>
                  <p className="text-[11px] text-gray-400 mt-1">PDF, TXT, HTML — max 32 Mo / fichier</p>
                </div>
                {files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-page-bg rounded text-[12px]">
                        <FileText size={12} className="text-gray-400" />
                        <span className="flex-1 truncate">{f.name}</span>
                        <span className="text-[10.5px] text-gray-400">{(f.size / 1_048_576).toFixed(1)} Mo</span>
                        <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-600"><X size={12} /></button>
                      </div>
                    ))}
                    <p className="text-[10.5px] text-gray-400 mt-1">Total : {sizeLabel}</p>
                  </div>
                )}
              </div>

              <div className="bg-gold-50 border border-gold-200 rounded-lg px-3 py-2.5 text-[11.5px] text-gold-700">
                <b>Coût estimé :</b> ~${estimatedCost.toFixed(2)} (Sonnet 4) — visible dans <code className="font-mono">/admin/monitoring</code> après génération
              </div>
            </div>
          )}

          {step === 3 && draft && (
            <div className="px-5 py-4 space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-[12px] text-green-700">
                <b>✓ Brouillon généré</b> — {draft.domains.length} domaines, {draft.domains.reduce((s, d) => s + d.controls.length, 0)} contrôles
                {tokens && <> · {tokens.input.toLocaleString('fr-FR')} input tokens, {tokens.output.toLocaleString('fr-FR')} output</>}
              </div>
              <p className="text-[12px] text-gray-500">Aperçu du brouillon. Vous pourrez tout éditer après création.</p>

              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                {draft.domains.map((d, i) => (
                  <details key={i} className="border-b border-gray-100 last:border-b-0" open={i < 3}>
                    <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-page-bg">
                      <span className="font-mono text-[11px] text-forest-700 font-bold">{d.code}</span>
                      <span className="text-[12.5px] font-semibold text-gray-900">{d.name}</span>
                      <span className="ml-auto text-[10.5px] text-gray-400">{d.controls.length} contrôle(s)</span>
                    </summary>
                    <ul className="px-4 pb-2 space-y-1">
                      {d.controls.map((c, j) => (
                        <li key={j} className="text-[11.5px] py-1 border-t border-gray-50">
                          <span className="font-mono text-[10.5px] text-forest-700 font-bold">{c.code}</span>
                          <span className="ml-2 font-medium text-gray-900">{c.name}</span>
                          {c.description && <p className="text-[11px] text-gray-500 mt-0.5">{c.description}</p>}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>

              <p className="text-[11px] text-gray-400 italic">
                Le référentiel sera marqué « Brouillon IA ». Relisez chaque contrôle avant publication, puis retirez le badge IA depuis la page d&apos;édition.
              </p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-between gap-2">
          <button onClick={onClose} disabled={generating || persisting} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Annuler
          </button>
          <div className="flex gap-2">
            {step > 1 && step < 3 && (
              <button onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} disabled={generating} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">← Précédent</button>
            )}
            {step === 1 && (
              <button onClick={() => setStep(2)} disabled={!step1Valid} className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg bg-forest-700 text-white hover:bg-forest-900 disabled:opacity-50">Suivant →</button>
            )}
            {step === 2 && (
              <button onClick={generate} disabled={generating} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold rounded-lg bg-gold-500 text-forest-900 hover:bg-gold-600 disabled:opacity-50">
                {generating ? <><Loader2 size={13} className="animate-spin" /> Génération…</> : <><Sparkles size={13} /> Générer le brouillon</>}
              </button>
            )}
            {step === 3 && (
              <button onClick={persist} disabled={persisting} className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg bg-forest-700 text-white hover:bg-forest-900 disabled:opacity-50">
                {persisting ? 'Création…' : 'Créer le référentiel'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function estimateCost(files: File[], instructions: string): number {
  // Très approximatif : 1 page PDF ≈ 500 tokens, 1 char texte ≈ 0.25 tokens
  const fileTokens = files.reduce((s, f) => s + (f.size / 1024) * 30, 0) // ~30 tokens / Ko PDF
  const briefTokens = instructions.length * 0.25
  const inputTokens = fileTokens + briefTokens + 500 // overhead prompt
  const outputTokens = 6000 // estimation pour un référentiel moyen
  return (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15 // Sonnet 4 pricing
}
