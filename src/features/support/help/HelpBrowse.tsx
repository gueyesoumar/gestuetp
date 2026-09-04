import { useMemo, useState } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'
import { HELP_ARTICLES, searchHelpArticles } from './helpContent'
import type { HelpArticle } from './helpContent'

const SUGGESTIONS = ['Réinitialiser mon mot de passe', 'Inviter un membre', 'Activer le 2FA', 'Créer une mission']

/** Recherche + parcours de la base de connaissances (statique, self-service). */
export function HelpBrowse(): JSX.Element {
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const trimmed = query.trim()
  const results = useMemo(() => (trimmed ? searchHelpArticles(trimmed) : HELP_ARTICLES), [trimmed])
  const list: HelpArticle[] = results

  return (
    <div>
      <div className="rounded-xl border border-forest-100 bg-forest-50 p-4">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 focus-within:border-forest-500 focus-within:ring-2 focus-within:ring-forest-100">
          <Search size={18} className="text-forest-600 flex-shrink-0" />
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
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600 hover:border-forest-300 hover:text-forest-700 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
        {trimmed ? `${list.length} résultat${list.length !== 1 ? 's' : ''}` : 'Questions fréquentes'}
      </p>

      {list.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-[13px] text-gray-500">
          Aucun article ne correspond. Contactez le support ci-dessous.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {list.map((a, i) => {
            const open = openId === a.id
            return (
              <div key={a.id} className={i > 0 ? 'border-t border-gray-100' : ''}>
                <button
                  onClick={() => setOpenId(open ? null : a.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-[13.5px] font-medium text-gray-900">{a.question}</span>
                  <ChevronDown size={16} className={`flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="px-4 pb-4">
                    <span className="mb-2 inline-block rounded-full bg-forest-50 px-2.5 py-0.5 text-[10px] font-semibold text-forest-700">{a.category}</span>
                    <p className="text-[13px] leading-relaxed text-gray-600">{a.answer}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
