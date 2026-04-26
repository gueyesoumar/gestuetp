import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'

const CATEGORIES = [
  { slug: 'conformite', label: 'Conformité' },
  { slug: 'gouvernance', label: 'Gouvernance' },
  { slug: 'evaluation', label: 'Évaluation' },
]

export function AdminFrameworkCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [version, setVersion] = useState('')
  const [publisher, setPublisher] = useState('')
  const [category, setCategory] = useState('conformite')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Auto-slug
  useEffect(() => {
    if (slugTouched) return
    const auto = name.trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
    setSlug(auto)
  }, [name, slugTouched])

  const slugValid = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/.test(slug)
  const ready = name.trim().length >= 2 && slugValid

  const submit = async () => {
    setSubmitting(true)
    const { data, error } = await supabase.functions.invoke('admin-framework', {
      body: {
        action: 'create_framework',
        name: name.trim(),
        slug: slug.trim(),
        version: version.trim() || null,
        publisher: publisher.trim() || null,
        category,
        description: description.trim() || null,
        was_ai_generated: false,
      },
    })
    setSubmitting(false)
    if (error) { toast.error('Création impossible', error); return }
    if (data?.error) { toast.error('Création impossible'); console.error(data.error); return }
    toast.success('Référentiel créé', { description: 'Ajoutez maintenant les domaines et contrôles.' })
    navigate(`/admin/frameworks/${data.framework.slug}`)
  }

  return (
    <div className="px-7 py-6 max-w-3xl">
      <Link to="/admin/frameworks" className="text-[12px] text-forest-700 font-semibold hover:text-forest-900 inline-flex items-center gap-1 mb-3">
        <ChevronLeft size={14} /> Retour aux référentiels
      </Link>

      <h1 className="text-xl font-bold text-gray-900 mb-1">Nouveau référentiel</h1>
      <p className="text-[12.5px] text-gray-500 mb-5">Créez un référentiel manuellement. Pour partir d&apos;un PDF, utilisez plutôt « Générer avec IA » depuis la liste.</p>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <Field label="Nom *">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ISO 27001:2022" disabled={submitting} />
        </Field>
        <Field label="Slug *" hint="Identifiant URL-safe — généré automatiquement, modifiable">
          <input type="text" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true) }} placeholder="iso-27001-2022" disabled={submitting} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Version">
            <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="2022" disabled={submitting} />
          </Field>
          <Field label="Éditeur / Publisher">
            <input type="text" value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="ISO" disabled={submitting} />
          </Field>
        </div>
        <Field label="Catégorie">
          <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={submitting}>
            {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={submitting} placeholder="Quelques lignes expliquant l'objet du référentiel" />
        </Field>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Link to="/admin/frameworks" className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</Link>
        <button onClick={submit} disabled={!ready || submitting} className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg bg-forest-700 text-white hover:bg-forest-900 disabled:opacity-50">
          {submitting ? 'Création…' : 'Créer'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10.5px] text-gray-400">{hint}</p>}
    </div>
  )
}
