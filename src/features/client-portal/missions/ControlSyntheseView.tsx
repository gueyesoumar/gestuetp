import { ChevronRight } from 'lucide-react'
import type { DomainSummary } from './useMissionControls'

interface ControlSyntheseViewProps {
  globalScore: number
  totalControls: number
  conformesCount: number
  observationsCount: number
  minorNcCount: number
  majorNcCount: number
  strengthsCount: number
  myObservationsCount: number
  domainSummaries: DomainSummary[]
  onSwitchToList: () => void
}

function barColor(score: number): string {
  if (score >= 70) return '#27AE60'
  if (score >= 50) return '#40916C'
  if (score >= 30) return '#D4A843'
  return '#C0392B'
}

export function ControlSyntheseView({
  globalScore, totalControls, conformesCount, observationsCount,
  minorNcCount, majorNcCount, myObservationsCount,
  domainSummaries, onSwitchToList,
}: ControlSyntheseViewProps): JSX.Element {
  const totalNc = minorNcCount + majorNcCount

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Score global</p>
          <p className="text-[24px] font-bold leading-none text-forest-700">{globalScore}%</p>
          <div className="h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
            <div
              className="h-1 rounded-full transition-all"
              style={{ width: `${globalScore}%`, background: barColor(globalScore) }}
            />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Conformes</p>
          <p className="text-[24px] font-bold leading-none text-green-600">
            {conformesCount}
            <span className="text-[13px] text-gray-300 font-normal"> / {totalControls}</span>
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Non-conformit&eacute;s</p>
          <p className="text-[24px] font-bold leading-none text-red-500">
            {totalNc}
            <span className="text-[13px] text-gray-300 font-normal"> ({majorNcCount} maj.)</span>
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Vos observations</p>
          <p className="text-[24px] font-bold leading-none text-gold-500">
            {myObservationsCount}
            {observationsCount > 0 && <span className="text-[13px] text-gray-300 font-normal"> / {observationsCount} total</span>}
          </p>
        </div>
      </div>

      {/* Domain bars */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold text-gray-900">Conformit&eacute; par domaine</h3>
          <button
            onClick={onSwitchToList}
            className="flex items-center gap-1 text-[12px] font-medium text-forest-700 hover:text-forest-900 transition-colors"
          >
            Voir la liste compl{'è'}te
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          {domainSummaries.map((d) => (
            <div key={d.domainId} className="flex items-center gap-3">
              <div className="w-[220px] flex items-center gap-2 shrink-0">
                <span className="font-mono text-[11px] font-semibold text-forest-700 bg-forest-50 px-1.5 py-0.5 rounded">
                  {d.code}
                </span>
                <span className="text-[12px] font-medium text-gray-700 truncate">{d.name}</span>
              </div>

              <div className="flex-1 h-[18px] bg-gray-100 rounded-md overflow-hidden">
                <div
                  className="h-full flex items-center pl-2 transition-all"
                  style={{ width: `${Math.max(d.score, 4)}%`, background: barColor(d.score) }}
                >
                  <span className="text-[10px] text-white font-bold">{d.score}%</span>
                </div>
              </div>

              <div className="w-[140px] flex gap-1 justify-end shrink-0 flex-wrap">
                {d.conformes > 0 && (
                  <span className="text-[9px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                    {d.conformes}&nbsp;conf.
                  </span>
                )}
                {d.strengths > 0 && (
                  <span className="text-[9px] font-medium text-gold-600 bg-gold-100 px-1.5 py-0.5 rounded-full">
                    {d.strengths}&nbsp;fort
                  </span>
                )}
                {d.observations > 0 && (
                  <span className="text-[9px] font-medium text-gold-600 bg-gold-50 px-1.5 py-0.5 rounded-full">
                    {d.observations}&nbsp;obs.
                  </span>
                )}
                {(d.minorNc + d.majorNc) > 0 && (
                  <span className="text-[9px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                    {d.minorNc + d.majorNc}&nbsp;NC
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4 flex-wrap text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-green-600 rounded-sm" /> {'≥'} 70% Bon
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-forest-500 rounded-sm" /> 50-69% Moyen
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-gold-500 rounded-sm" /> 30-49% Faible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-sm" /> &lt; 30% Critique
          </span>
        </div>
      </div>
    </div>
  )
}
