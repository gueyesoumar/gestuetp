import type { EntityScore } from './useSupervisionData'

interface SupervisionHeatmapProps {
  entities: EntityScore[]
  domains: { code: string; name: string }[]
  frameworkName: string
}

function cellClass(score: number | undefined): string {
  if (score === undefined) return 'bg-gray-100 text-gray-400'
  if (score >= 80) return 'bg-emerald-100 text-emerald-700'
  if (score >= 60) return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-700'
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-700'
  if (score >= 60) return 'text-gold-500'
  return 'text-red-600'
}

export function SupervisionHeatmap({ entities, domains, frameworkName }: SupervisionHeatmapProps) {
  if (entities.length === 0 || domains.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-sm text-gray-400">Aucune donn&eacute;e disponible pour la heatmap.</p>
      </div>
    )
  }

  // Compute averages per domain
  const domainAvgs: Record<string, number> = {}
  for (const d of domains) {
    const vals = entities.map((e) => e.domainScores[d.code]).filter((v) => v !== undefined)
    domainAvgs[d.code] = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  }

  const totalAvg = entities.length > 0
    ? Math.round(entities.reduce((a, e) => a + e.globalScore, 0) / entities.length)
    : 0

  // Find weakest domains
  const sorted = domains
    .map((d) => ({ ...d, avg: domainAvgs[d.code] }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 3)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-bold text-gray-900">Conformit&eacute; par domaine {'\u00d7'} entit&eacute;</h3>
        <span className="text-[11px] text-gray-400">{frameworkName}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] font-semibold uppercase text-gray-400">
              <th className="text-left px-2 py-2 w-[200px]">Entit&eacute;</th>
              {domains.map((d) => (
                <th key={d.code} className="px-1 py-2 text-center" title={d.name}>{d.code}</th>
              ))}
              <th className="px-2 py-2 font-bold">MOY.</th>
            </tr>
          </thead>
          <tbody className="text-[12px]">
            {entities.map((entity) => (
              <tr key={entity.clientId} className="border-t border-gray-50">
                <td className="px-2 py-2 font-medium text-gray-900 text-[12px] truncate max-w-[200px]">{entity.clientName}</td>
                {domains.map((d) => {
                  const score = entity.domainScores[d.code]
                  return (
                    <td key={d.code} className="px-1 py-1">
                      <div className={`w-[52px] h-9 mx-auto flex items-center justify-center rounded-md text-[11px] font-semibold ${cellClass(score)}`}>
                        {score !== undefined ? score : '\u2014'}
                      </div>
                    </td>
                  )
                })}
                <td className={`px-2 py-1 font-bold ${scoreColor(entity.globalScore)}`}>{entity.globalScore}%</td>
              </tr>
            ))}

            {/* Average row */}
            <tr className="border-t-2 border-forest-200 bg-forest-50/50">
              <td className="px-2 py-2 font-bold text-forest-700 text-[12px]">MOYENNE</td>
              {domains.map((d) => (
                <td key={d.code} className="px-1 py-1">
                  <div className={`w-[52px] h-9 mx-auto flex items-center justify-center rounded-md text-[11px] font-bold ${cellClass(domainAvgs[d.code])}`}>
                    {domainAvgs[d.code]}
                  </div>
                </td>
              ))}
              <td className="px-2 py-1 font-extrabold text-forest-700">{totalAvg}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Weakest domains */}
      {sorted.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          {sorted.map((d, i) => (
            <div
              key={d.code}
              className={`rounded-lg border p-4 ${
                i === 0
                  ? 'border-red-200 bg-red-50'
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className={`text-[10px] font-semibold uppercase ${i === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                {i === 0 ? 'Domaine le plus faible' : `${i + 1}e domaine faible`}
              </div>
              <div className={`mt-1 text-[14px] font-bold ${i === 0 ? 'text-red-700' : 'text-amber-700'}`}>
                {d.code} {'\u2014'} {d.name}
              </div>
              <div className={`mt-1 text-[12px] ${i === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                {d.avg}% de conformit&eacute; moyenne
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
