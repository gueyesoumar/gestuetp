interface Alert {
  kind: 'warn' | 'info' | 'red'
  message: string
}

const STYLE: Record<Alert['kind'], { dot: string; badge: string; icon: string }> = {
  red: { dot: 'bg-red-500', badge: 'bg-red-50 text-red-700', icon: '!' },
  warn: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700', icon: '⚠' },
  info: { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700', icon: 'i' },
}

/** Feed d'attention — alertes plateforme réelles (admin-stats). */
export function AttentionFeed({ alerts }: { alerts: Alert[] }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="flex items-center px-4 py-3 border-b border-gray-200">
        <span className="text-[13px] font-bold text-gray-900">Attention</span>
        {alerts.length > 0 && (
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 tabular-nums">{alerts.length}</span>
        )}
      </header>
      {alerts.length === 0 ? (
        <div className="px-4 py-8 text-center text-[12px] text-gray-400">Aucune alerte — tout est en ordre.</div>
      ) : (
        <div>
          {alerts.map((a, i) => {
            const s = STYLE[a.kind]
            return (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 ${i < alerts.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <span className={`mt-1 shrink-0 w-2 h-2 rounded-full ${s.dot}`} />
                <div className="text-[12.5px] text-gray-700 leading-relaxed">{a.message}</div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
