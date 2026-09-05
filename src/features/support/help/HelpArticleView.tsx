import { ArrowLeft } from 'lucide-react'
import { SafeMarkdown } from '../../../components/ui/SafeMarkdown'
import type { HelpArticle } from '../../../types/database.types'

/** Vue d'un article de la base de connaissances (corps markdown rendu en toute sécurité). */
export function HelpArticleView({ article, onBack }: { article: HelpArticle; onBack: () => void }): JSX.Element {
  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600">
        <ArrowLeft size={15} /> Retour à l&apos;aide
      </button>
      <span className="inline-block rounded-full bg-forest-50 px-2.5 py-0.5 text-[10px] font-semibold text-forest-700">
        {article.category}
      </span>
      <h2 className="mt-2 text-lg font-bold text-gray-900">{article.title}</h2>
      <div className="mt-3 max-w-2xl text-[13px] text-gray-700">
        <SafeMarkdown>{article.body}</SafeMarkdown>
      </div>
    </div>
  )
}
