import { memo } from 'react'
import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Rendu markdown enrichi pour les articles d'aide : titres, listes, liens et
// images. Anti-XSS : `skipHtml` (aucun HTML brut) + `allowedElements` en liste
// blanche ; react-markdown assainit les URL (protocoles sûrs) par défaut.

const ALLOWED = ['h2', 'h3', 'h4', 'p', 'strong', 'em', 'ul', 'ol', 'li', 'code', 'pre', 'a', 'img', 'blockquote', 'hr', 'br']

type C = { children?: ReactNode }

const components = {
  h2: ({ children }: C) => <h2 className="mt-5 mb-2 text-[15px] font-bold text-gray-900 first:mt-0">{children}</h2>,
  h3: ({ children }: C) => <h3 className="mt-4 mb-1.5 text-[14px] font-semibold text-gray-900">{children}</h3>,
  h4: ({ children }: C) => <h4 className="mt-3 mb-1 text-[13px] font-semibold text-gray-700">{children}</h4>,
  p: ({ children }: C) => <p className="my-2 leading-relaxed">{children}</p>,
  strong: ({ children }: C) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }: C) => <em className="italic">{children}</em>,
  ul: ({ children }: C) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }: C) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }: C) => <li className="leading-relaxed">{children}</li>,
  code: ({ children }: C) => <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.95em] text-forest-800">{children}</code>,
  blockquote: ({ children }: C) => <blockquote className="my-3 border-l-2 border-forest-300 bg-forest-50 px-3 py-2 text-gray-600">{children}</blockquote>,
  hr: () => <hr className="my-4 border-gray-100" />,
  a: ({ href, children }: C & { href?: string }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-forest-700 underline hover:text-forest-900">{children}</a>
  ),
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    <img src={src} alt={alt ?? ''} loading="lazy" className="my-3 rounded-lg border border-gray-200" />
  ),
}

function ArticleMarkdownInner({ children, className }: { children: string; className?: string }): JSX.Element {
  return (
    <div className={className}>
      <ReactMarkdown allowedElements={ALLOWED} unwrapDisallowed skipHtml remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

export const ArticleMarkdown = memo(ArticleMarkdownInner)
