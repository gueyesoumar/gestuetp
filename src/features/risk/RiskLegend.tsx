/** Légende des acronymes du module Risk (cotation V×I, exposition, IIC, cycle). */
export function RiskLegend(): JSX.Element {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">Légende</h3>
      <div className="grid gap-y-1.5 gap-x-5 text-[12px] text-gray-600 sm:grid-cols-2 lg:grid-cols-3">
        <div><b className="font-mono text-gray-900">V</b> Vraisemblance (1 rare &rarr; 4 quasi-sûr)</div>
        <div><b className="font-mono text-gray-900">I</b> Impact (1 mineur &rarr; 4 critique)</div>
        <div><b className="font-mono text-gray-900">V2·I1</b> cotation · exposition = V×I/16 × 100</div>
        <div><span className="font-bold text-[#C0392B]">≥ 60</span> critique · <span className="font-bold text-[#B8860B]">30-59</span> à surveiller · <span className="font-bold text-[#27AE60]">&lt; 30</span> maîtrisé</div>
        <div><span className="inline-block w-[10px] h-[10px] rounded-sm border-[1.5px] border-[#C08A1E] bg-[#f7edd3] align-[-1px] mr-1.5"></span><b>IIC</b> infrastructure d&apos;importance critique</div>
        <div>Cycle : identifié &rarr; analysé &rarr; évalué &rarr; traité &rarr; accepté &rarr; surveillé</div>
      </div>
    </div>
  )
}
