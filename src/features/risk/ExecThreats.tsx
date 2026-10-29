import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { ExecThreat } from './execSynthesis'
import { severityOf, SEVERITY_LABEL } from './execSynthesis'
import { ExecImpactDrawer } from './ExecImpactDrawer'

const SEV: Record<string, { stripe: string; color: string }> = {
  critique: { stripe: '#C0392B', color: '#C0392B' },
  serieux: { stripe: '#B8860B', color: '#B8860B' },
  modere: { stripe: '#9CA3AF', color: '#6B7280' },
}

/** « Ce qui peut arriver de plus grave » : top menaces cliquables -> simulation d'impact. */
export function ExecThreats({ threats }: { threats: ExecThreat[] }): JSX.Element {
  const [sel, setSel] = useState<ExecThreat | null>(null)
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900">Ce qui peut arriver de plus grave</h3>
        <p className="text-[11.5px] text-gray-500 mt-0.5">Conséquences possibles si rien n&apos;est fait.</p>
      </div>
      <div>
        {threats.map((th, i) => {
          const sev = severityOf(th.exposure)
          const s = SEV[sev]
          return (
            <button key={th.id} onClick={() => setSel(th)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-t border-gray-100 first:border-t-0 hover:bg-gray-50 relative">
              <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded" style={{ background: s.stripe }} />
              <span className="font-mono font-bold text-[15px] text-[#9C7A1F] pl-1.5">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-semibold text-gray-900 leading-snug">{th.title}</div>
                <div className="text-[11.5px] text-gray-500 mt-0.5 flex items-center gap-2">{th.org_name}{th.is_iic && <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#FBF4E2] text-[#9C7A1F] border border-[#E6D7A8]">Vitale</span>}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono font-bold text-[17px]" style={{ color: s.color }}>{th.exposure}</div>
                <div className="text-[8px] font-semibold uppercase tracking-wide text-gray-400 leading-tight">Niv. exposition</div>
                <div className="text-[9px] font-bold uppercase tracking-wide mt-0.5" style={{ color: s.color }}>{SEVERITY_LABEL[sev]}</div>
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </button>
          )
        })}
      </div>
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-500">Cliquez un scénario pour simuler son impact si le risque se matérialise.</div>
      <ExecImpactDrawer threat={sel} onClose={() => setSel(null)} />
    </div>
  )
}
