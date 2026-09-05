import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { ArticleMarkdown } from '../../../components/ui/ArticleMarkdown'
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
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const onTitle = (v: string): void => {
    setTitle(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  const insertAtCursor = (text: string): void => {
    const ta = bodyRef.current
    const start = ta?.selectionStart ?? body.length
    const end = ta?.selectionEnd ?? body.length
    const next = body.slice(0, start) + text + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      if (!ta) return
      ta.focus()
      const pos = start + text.length
      ta.setSelectionRange(pos, pos)
    })
  }

  const onPickImage = async (file: File): Promise<void> => {
    setUploadErr(null); setUploading(true)
    const safe = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `articles/${Date.now()}_${safe}`
    const { error } = await supabase.storage.from('help-media').upload(path, file)
    if (error) {
      console.error('help image upload:', error.message)
      setUploadErr('Téléversement impossible.')
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('help-media').getPublicUrl(path)
    setUploading(false)
    if (data?.publicUrl) insertAtCursor(`\n\n![${file.name.replace(/\.[^.]+$/, '')}](${data.publicUrl})\n\n`)
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
        <div className="mb-1 flex items-center gap-2">
          <label className={label}>Contenu (markdown)</label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-[12px] text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <ImagePlus size={14} /> {uploading ? 'Téléversement…' : 'Insérer une image'}
          </button>
          <input
            ref={fileRef} type="file" accept="image/*" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickImage(f); e.target.value = '' }}
          />
        </div>
        <textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={10} className={`${field} resize-y font-mono`} />
        {uploadErr && <p className="mt-1 text-[12px]" style={{ color: 'var(--color-error)' }}>{uploadErr}</p>}
        {body.trim() && (
          <div className="mt-2 rounded-lg border border-gray-200 bg-page-bg p-3 text-[13px] text-gray-700">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Aperçu</p>
            <ArticleMarkdown>{body}</ArticleMarkdown>
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
