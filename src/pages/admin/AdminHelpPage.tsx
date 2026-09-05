import { useState } from 'react'
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { useHelpArticlesAdmin } from '../../features/support/help/useHelpArticlesAdmin'
import { HelpArticleEditor } from '../../features/support/help/HelpArticleEditor'
import type { HelpArticle, HelpArticleInsert } from '../../types/database.types'

export function AdminHelpPage(): JSX.Element {
  const { articles, loading, error, create, update, remove } = useHelpArticlesAdmin()
  const [view, setView] = useState<'list' | 'form'>('list')
  const [current, setCurrent] = useState<HelpArticle | null>(null)
  const [saving, setSaving] = useState(false)

  const openNew = (): void => { setCurrent(null); setView('form') }
  const openEdit = (a: HelpArticle): void => { setCurrent(a); setView('form') }

  const save = async (input: HelpArticleInsert): Promise<void> => {
    setSaving(true)
    const ok = current ? await update(current.id, input) : await create(input)
    setSaving(false)
    if (ok) setView('list')
  }

  const onDelete = async (a: HelpArticle): Promise<void> => {
    if (!window.confirm(`Supprimer l'article « ${a.title} » ?`)) return
    await remove(a.id)
  }

  if (view === 'form') {
    return (
      <div className="p-6">
        <button onClick={() => setView('list')} className="mb-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600">
          <ArrowLeft size={15} /> Base de connaissances
        </button>
        <h1 className="mb-4 text-xl font-bold text-gray-900">{current ? 'Modifier l’article' : 'Nouvel article'}</h1>
        <HelpArticleEditor article={current} saving={saving} error={error} onSave={save} onCancel={() => setView('list')} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Base de connaissances</h1>
          <p className="mt-1 text-sm text-gray-500">Articles d&apos;aide affichés dans le Centre d&apos;aide.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-900">
          <Plus size={16} /> Nouvel article
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Chargement&hellip;</p>
      ) : articles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">Aucun article.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-100 bg-gray-50/50">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-gray-400">Titre</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-gray-400">Catégorie</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-gray-400">Audience</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-gray-400">Statut</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 last:border-b-0">
                  <td className="px-4 py-3 text-gray-900">{a.title}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{a.category}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{a.audience}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.is_published ? 'bg-forest-50 text-forest-700' : 'bg-gray-100 text-gray-500'}`}>
                      {a.is_published ? 'Publié' : 'Brouillon'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(a)} className="rounded p-1 text-gray-400 hover:bg-forest-50 hover:text-forest-700" title="Modifier"><Pencil size={15} /></button>
                      <button onClick={() => void onDelete(a)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Supprimer"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
