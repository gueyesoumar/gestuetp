import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface SafeMarkdownProps {
  children: string
  className?: string
  inline?: boolean
}

const ALLOWED_BLOCK = ['p', 'strong', 'em', 'ul', 'ol', 'li', 'code']
const ALLOWED_INLINE = ['p', 'strong', 'em', 'code']

const blockComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="leading-relaxed mb-1 last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-4 my-1 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-4 my-1 space-y-0.5">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="px-1 py-0.5 rounded bg-gray-100 text-[0.95em] font-mono text-forest-800">{children}</code>
  ),
}

const inlineComponents = {
  // Force markdown <p> to render as span so it stays inline with sibling labels
  p: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  strong: blockComponents.strong,
  em: blockComponents.em,
  code: blockComponents.code,
}

function SafeMarkdownInner({ children, className, inline }: SafeMarkdownProps) {
  if (inline) {
    return (
      <span className={className}>
        <ReactMarkdown
          allowedElements={ALLOWED_INLINE}
          unwrapDisallowed
          skipHtml
          components={inlineComponents}
        >
          {children}
        </ReactMarkdown>
      </span>
    )
  }
  return (
    <div className={className}>
      <ReactMarkdown
        allowedElements={ALLOWED_BLOCK}
        unwrapDisallowed
        skipHtml
        remarkPlugins={[remarkGfm]}
        components={blockComponents}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

export const SafeMarkdown = memo(SafeMarkdownInner)
