import { AlertTriangle } from 'lucide-react'
import type { EntityScore } from './useSupervisionData'

interface SupervisionRisksProps {
  entities: EntityScore[]
  domains: { code: string; name: string }[]
}

interface SystemicRisk {
  domain: string
  domainName: string
  avgScore: number
  failingEntities: number
  totalEntities: number
  level: 'critical' | 'high'
}

export function SupervisionRisks({ entities, domains }: SupervisionRisksProps) {
  if (entities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-sm text-gray-400">Aucune donn&eacute;e disponible.</p>
      </div>
    )
  }

  // Identify systemic risks: domains where avg < 60% or >50% entities fail
  const risks: SystemicRisk[] = []
  for (const d of domains) {
    const scores = entities.map((e) => e.domainScores[d.code]).filter((v) => v !== undefined)
    if (scores.length === 0) continue

    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const failing = scores.filter((s) => s < 60).length

    if (avg < 60 || failing > entities.length / 2) {
      risks.push({
        domain: d.code,
        domainName: d.name,
        avgScore: avg,
        failingEntities: failing,
        totalEntities: entities.length,
        level: avg < 40 ? 'critical' : 'high',
      })
    }
  }

  risks.sort((a, b) => a.avgScore - b.avgScore)

  // Also add NC-based risks
  const highNcEntities = entities.filter((e) => e.majorNcCount >= 5)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-gray-900">Risques syst&eacute;miques identifi&eacute;s</h3>
        <span className="text-[11px] text-gray-400">Domaines sous le seuil de 60% ou en &eacute;chec sur &gt; 50% des entit&eacute;s</span>
      </div>

      {risks.length === 0 && highNcEntities.length === 0 ? (
        <div className="bg-white rounded-xl border border-emerald-200 p-8 text-center">
          <p className="text-sm text-emerald-600 font-medium">Aucun risque syst&eacute;mique identifi&eacute; {'\u2014'} tous les domaines sont au-dessus du seuil.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {risks.map((risk) => (
            <RiskCard key={risk.domain} risk={risk} />
          ))}

          {highNcEntities.length > 0 && (
            <div className="bg-white rounded-xl border border-red-200 p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-red-400 uppercase">Concentration de NC majeures</div>
                  <div className="text-[14px] font-bold text-gray-900 mt-0.5">
                    {highNcEntities.length} entit&eacute;{highNcEntities.length > 1 ? 's' : ''} avec 5+ NC majeures
                  </div>
                  <div className="text-[12px] text-gray-600 mt-1">
                    {highNcEntities.map((e) => e.clientName).join(', ')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RiskCard({ risk }: { risk: SystemicRisk }) {
  const isCrit = risk.level === 'critical'
  return (
    <div className={`bg-white rounded-xl border p-5 ${isCrit ? 'border-red-200' : 'border-amber-200'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isCrit ? 'bg-red-100' : 'bg-amber-100'}`}>
          <AlertTriangle size={20} className={isCrit ? 'text-red-600' : 'text-amber-600'} />
        </div>
        <div>
          <div className={`text-[10px] font-semibold uppercase ${isCrit ? 'text-red-400' : 'text-amber-400'}`}>
            {isCrit ? 'Risque critique' : 'Risque \u00e9lev\u00e9'}
          </div>
          <div className="text-[14px] font-bold text-gray-900 mt-0.5">
            {risk.domain} {'\u2014'} {risk.domainName}
          </div>
          <div className="text-[12px] text-gray-600 mt-1">
            {risk.avgScore}% de conformit&eacute; moyenne {'\u2014'} {risk.failingEntities}/{risk.totalEntities} entit&eacute;s sous le seuil
          </div>
          <div className="mt-2 flex gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isCrit ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
              {risk.avgScore}% moyen
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {risk.failingEntities} entit&eacute;s concern&eacute;es
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
