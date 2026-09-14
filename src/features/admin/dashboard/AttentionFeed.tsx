export interface FeedItem {
  severity: 'crit' | 'warn' | 'info'
  title: string
  detail?: string
}

const DOT: Record<FeedItem['severity'], string> = {
  crit: 'bg-red-500',
  warn: 'bg-amber-500',
  info: 'bg-blue-500',
}

/** Feed d'attention — alertes + signaux réels (admin-stats), priorisés par sévérité. */
export function AttentionFeed({ items }: { items: FeedItem[] }) {
  const ordered = [...items].sort((a, b) => rank(a.severity) - rank(b.severity))
  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="flex items-center px-4 py-3 border-b border-gray-200">
        <span className="text-[13px] font-bold text-gray-900">À traiter</span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-gray-400 font-semibold">priorisé par impact</span>
      </header>
      {ordered.length === 0 ? (
        <div className="px-4 py-8 text-center text-[12px] text-gray-400">Aucun signal — tout est en ordre.</div>
      ) : (
        <div>
          {ordered.map((it, i) => (
            <div key={i} className={`flex items-start gap-3 px-4 py-3 ${i < ordered.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <span className={`mt-1 shrink-0 w-2 h-2 rounded-full ${DOT[it.severity]}`} />
              <div>
                <div className="text-[12.5px] font-semibold text-gray-900 leading-snug">{it.title}</div>
                {it.detail && <div className="text-[11.5px] text-gray-500 mt-0.5">{it.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function rank(s: FeedItem['severity']): number {
  return s === 'crit' ? 0 : s === 'warn' ? 1 : 2
}
