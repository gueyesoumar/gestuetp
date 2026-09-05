import { useState } from 'react'
import type { FormEvent } from 'react'
import { SafeMarkdown } from '../../../components/ui/SafeMarkdown'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import type { HelpArticle, HelpArticleInsert, HelpAudience } from '../../../types/database.types'

interface Props {
  article: HelpArticle | null
  saving: boolean
  error: string | null
  onSave: (input: HelpArticleInsert) => void
  onCancel: () => void
}

const AUDIENCES: { value: HelpAudience; label: string }[] = [
  { value: 'all', label: 'Tout le monde' },
  { value: 'staff', label: 'Cabinet (staff)' },
  { value: 'client', label: 'Portail client' },
]

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const field = 'mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100'
const label = 'block text-[12px] font-medium text-gray-600'

export function HelpArticleEditor({ article, saving, error, onSave, onCancel }: Props): JSX.Element {
  const [title, setTitle] = useState(article?.title ?? '')
  const [slug, setSlug] = useState(article?.slug ?? '')
  const [category, setCategory] = useState(article?.category ?? '')
  const [audience, setAudience] = useState<HelpAudience>(article?.audience ?? 'all')
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '')
  const [body, setBody] = useState(article?.body ?? '')
  const [isPublished, setIsPublished] = useState(article?.is_published ?? true)
  const [sortOrder, setSortOrder] = useState(article?.sort_order ?? 0)
  const [slugTouched, setSlugTouched] = useState(Boolean(article))

  const onTitle = (v: string): void => {
    setTitle(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  const submit = (e: FormEvent): void => {
    e.preventDefault()
    if (!title.trim() || !slug.trim() || !category.trim()) return
    onSave({ title: title.trim(), slug: slug.trim(), category: category.trim(), audience, excerpt: excerpt.trim(), body, is_published: isPublished, sort_order: sortOrder })
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-4">
      {error && <ErrorAlert message={error} />}
      <div>
        <label className={label}>Titre</label>
        <input value={title} onChange={(e) => onTitle(e.target.value)} required className={field} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Slug</label>
          <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true) }} required className={`${field} font-mono`} />
        </div>
        <div>
          <label className={label}>Catégorie</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} required placeholder="Ex : Compte & sécurité" className={field} />
        </div>
      </div>
      <div>
        <label className={label}>Extrait (résumé affiché dans la liste et la recherche)</label>
        <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className={field} />
      </div>
      <div>
        <label className={label}>Contenu (markdown)</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className={`${field} resize-y font-mono`} />
        {body.trim() && (
          <div className="mt-2 rounded-lg border border-gray-200 bg-page-bg p-3 text-[13px] text-gray-700">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Aperçu</p>
            <SafeMarkdown>{body}</SafeMarkdown>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={label}>Audience</label>
          <select value={audience} onChange={(e) => setAudience(e.target.value as HelpAudience)} className={field}>
            {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Ordre</label>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className={field} />
        </div>
        <label className="flex items-end gap-2 pb-2 text-[13px] text-gray-700">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="rounded border-gray-300 text-forest-600 focus:ring-forest-500" />
          Publié
        </label>
      </div>
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-50">Annuler</button>
        <button type="submit" disabled={saving} className="rounded-lg bg-forest-700 px-5 py-2 text-[13px] font-semibold text-white hover:bg-forest-900 disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}
