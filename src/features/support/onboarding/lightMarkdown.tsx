import type { ReactNode } from 'react'

// Rendu Markdown minimal et SÛR : produit des éléments React, JAMAIS de
// dangerouslySetInnerHTML (règle sécurité §3). Gère l'essentiel des réponses de
// l'assistant : titres (#/##/###), gras (**...**), listes à puces et numérotées,
// paragraphes. Tout le reste est rendu en texte échappé par React.

function renderInline(text: string, keyBase: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={`${keyBase}-b${i}`}>{part.slice(2, -2)}</strong>
    return <span key={`${keyBase}-t${i}`}>{part}</span>
  })
}

export function LightMarkdown({ text }: { text: string }): JSX.Element {
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flush = (): void => {
    if (!list) return
    const { ordered, items } = list
    const cls = 'my-1 space-y-0.5 pl-5'
    blocks.push(
      ordered ? (
        <ol key={`ol${blocks.length}`} className={`${cls} list-decimal`}>
          {items.map((it, i) => <li key={i}>{renderInline(it, `oli${blocks.length}-${i}`)}</li>)}
        </ol>
      ) : (
        <ul key={`ul${blocks.length}`} className={`${cls} list-disc`}>
          {items.map((it, i) => <li key={i}>{renderInline(it, `uli${blocks.length}-${i}`)}</li>)}
        </ul>
      ),
    )
    list = null
  }

  text.split('\n').forEach((raw, idx) => {
    const line = raw.trim()
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    const bullet = /^[-*•]\s+(.*)$/.exec(line)
    const numbered = /^\d+\.\s+(.*)$/.exec(line)

    if (heading) {
      flush()
      blocks.push(<p key={`h${idx}`} className="mt-2 mb-0.5 font-semibold text-forest-900">{renderInline(heading[2], `h${idx}`)}</p>)
    } else if (bullet) {
      if (list && !list.ordered) list.items.push(bullet[1])
      else { flush(); list = { ordered: false, items: [bullet[1]] } }
    } else if (numbered) {
      if (list && list.ordered) list.items.push(numbered[1])
      else { flush(); list = { ordered: true, items: [numbered[1]] } }
    } else if (line === '') {
      flush()
    } else {
      flush()
      blocks.push(<p key={`p${idx}`} className="my-0.5">{renderInline(line, `p${idx}`)}</p>)
    }
  })
  flush()

  return <div className="space-y-0.5">{blocks}</div>
}
