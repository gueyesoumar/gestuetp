import { useMemo, useState } from 'react'
import { Search, X, ChevronRight } from 'lucide-react'
import { useHelpArticles } from './useHelpArticles'
import { searchHelpArticles } from './helpContent'
import { HelpArticleView } from './HelpArticleView'
import type { HelpArticle } from '../../../types/database.types'

const SUGGESTIONS = ['Réinitialiser mon mot de passe', 'Inviter un membre', 'Activer le 2FA', 'Créer une mission']

/** Recherche + parcours de la base de connaissances, avec ouverture d'un article. */
export function HelpBrowse(): JSX.Element {
  const { articles, loading } = useHelpArticles('staff')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<HelpArticle | null>(null)

  const trimmed = query.trim()
  const results = useMemo(() => searchHelpArticles(articles, trimmed), [articles, trimmed])

  if (selected) return <HelpArticleView article={selected} onBack={() => setSelected(null)} />

  return (
    <div>
      <div className="rounded-xl border border-forest-100 bg-forest-50 p-4">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 focus-within:border-forest-500 focus-within:ring-2 focus-within:ring-forest-100">
          <Search size={18} className="flex-shrink-0 text-forest-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher dans l'aide — ex : réinitialiser mon mot de passe…"
            className="flex-1 bg-transparent text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
            aria-label="Rechercher dans l'aide"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600" aria-label="Effacer">
              <X size={16} />
            </button>
          )}
        </div>
        {!trimmed && (
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600 transition-colors hover:border-forest-300 hover:text-forest-700"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
        {trimmed ? `${results.length} résultat${results.length !== 1 ? 's' : ''}` : "Articles d'aide"}
      </p>

      {loading ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-[13px] text-gray-400">Chargement&hellip;</p>
      ) : results.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-[13px] text-gray-500">
          Aucun article ne correspond. Contactez le support ci-dessous.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {results.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 ${i > 0 ? 'border-t border-gray-100' : ''}`}
            >
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium text-gray-900">{a.title}</span>
                <span className="mt-0.5 block truncate text-[12px] text-gray-400">{a.excerpt}</span>
              </span>
              <ChevronRight size={16} className="flex-shrink-0 text-gray-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
