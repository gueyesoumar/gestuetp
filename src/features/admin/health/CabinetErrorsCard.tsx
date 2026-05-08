import { AlertTriangle } from 'lucide-react'
import type { ErrorsStats } from './useCabinetHealth'

interface ErrorsCardProps {
  data: ErrorsStats
}

export function CabinetErrorsCard({ data }: ErrorsCardProps): JSX.Element {
  const hasErrors = data.aiErrors30d > 0
  const badgeClass = hasErrors
    ? 'bg-red-50 text-red-700'
    : 'bg-emerald-50 text-emerald-700'

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="px-5 py-3 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
          <AlertTriangle size={14} />
        </div>
        <h3 className="text-[13.5px] font-bold text-gray-900">Erreurs techniques</h3>
        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`}>
          {hasErrors ? `${data.aiErrors30d} erreur${data.aiErrors30d > 1 ? 's' : ''} · 30j` : 'Aucune erreur · 30j'}
        </span>
      </header>
      <div className="px-5 py-4 space-y-2.5">
        {data.topAiError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10.5px] uppercase tracking-wider text-red-700 font-bold">Top fonction en échec</span>
              <span className="text-[10.5px] text-red-600 font-semibold">
                {data.topAiError.count} échec{data.topAiError.count > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-[12.5px] font-mono text-red-800 font-semibold">{data.topAiError.functionName}</p>
            {data.topAiError.lastMessage && (
              <p className="text-[11px] text-gray-600 italic mt-1 truncate" title={data.topAiError.lastMessage}>
                &laquo; {data.topAiError.lastMessage} &raquo;
              </p>
            )}
          </div>
        ) : (
          <p className="text-[11.5px] text-gray-500">Aucune erreur IA enregistrée sur la période.</p>
        )}
        <p className="text-[10.5px] text-gray-400 italic">
          Les erreurs côté edge functions et auth ne sont pas encore loggées centralement.
        </p>
      </div>
    </section>
  )
}
