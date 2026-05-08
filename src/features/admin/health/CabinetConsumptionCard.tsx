import { Sparkles } from 'lucide-react'
import type { ConsumptionStats } from './useCabinetHealth'

interface ConsumptionCardProps {
  data: ConsumptionStats
}

export function CabinetConsumptionCard({ data }: ConsumptionCardProps): JSX.Element {
  const maxCalls = data.topAiFunctions.length > 0 ? data.topAiFunctions[0].count : 0

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="px-5 py-3 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
          <Sparkles size={14} />
        </div>
        <h3 className="text-[13.5px] font-bold text-gray-900">Consommation IA</h3>
        <span className="ml-auto text-[10.5px] text-gray-400 font-medium">30 derniers jours</span>
      </header>
      <div className="px-5 py-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Tile label="Appels" value={data.aiCalls30d.toLocaleString('fr-FR')} />
          <Tile
            label="Tokens"
            value={(data.aiInputTokens30d + data.aiOutputTokens30d).toLocaleString('fr-FR')}
            sub={`in: ${data.aiInputTokens30d.toLocaleString('fr-FR')} · out: ${data.aiOutputTokens30d.toLocaleString('fr-FR')}`}
          />
          <Tile
            label="Coût estimé"
            value={`$${data.aiCostUsd30d.toFixed(2)}`}
            highlight
          />
        </div>

        {data.topAiFunctions.length > 0 ? (
          <>
            <p className="text-[10.5px] uppercase tracking-wider text-gray-500 font-bold mb-2">Top fonctions appelées</p>
            <div className="space-y-1.5">
              {data.topAiFunctions.map((fn) => {
                const widthPct = maxCalls > 0 ? (fn.count / maxCalls) * 100 : 0
                return (
                  <div key={fn.name} className="flex items-center gap-3">
                    <span className="text-[11.5px] font-mono text-gray-700 w-40 truncate" title={fn.name}>{fn.name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${widthPct}%` }} />
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-gray-700 w-16 text-right">
                      {fn.count} call{fn.count > 1 ? 's' : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <p className="text-[11px] text-gray-400 italic">Aucun appel IA sur la période.</p>
        )}
      </div>
    </section>
  )
}

function Tile({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }): JSX.Element {
  if (highlight) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
        <p className="text-[10px] uppercase tracking-wider text-purple-700 font-bold mb-1">{label}</p>
        <p className="text-[18px] font-extrabold text-purple-900 font-mono">{value}</p>
        {sub && <p className="text-[10px] text-purple-700/70 mt-0.5 truncate">{sub}</p>}
      </div>
    )
  }
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">{label}</p>
      <p className="text-[18px] font-extrabold text-gray-900 font-mono">{value}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}
