import type { ReactNode } from 'react'
import { Shield, FileText } from 'lucide-react'
import { RISK_CONTROL_LINK_KINDS } from '../../lib/constants'

export interface Barrier { label: string; kind: string; effectiveness: number; type: 'control' | 'policy' }

export const pct = (v: number): number => Math.round(v * 100)
export const expColor = (v: number): string => (v >= 60 ? '#C0392B' : v >= 30 ? '#B8860B' : '#27AE60')
const kindLabel = (k: string): string => RISK_CONTROL_LINK_KINDS.find((x) => x.value === k)?.label ?? k

export function Node({ tone, text }: { tone: 'red' | 'amber'; text: string }): JSX.Element {
  const c = tone === 'red' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-[#8a6d16] border-amber-100'
  return <div className={`rounded-xl border px-3 py-2.5 text-center text-[12.5px] font-semibold ${c}`}>{text}</div>
}

/** Un bras du nœud papillon : étiquette + nœud + barrières (préventives ou correctives). */
export function Arm({ cap, capColor, node, barriersCap, barriers }: { cap: string; capColor: string; node: ReactNode; barriersCap: string; barriers: Barrier[] }): JSX.Element {
  return (
    <div className="p-4">
      <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5 text-center" style={{ color: capColor }}>{cap}</div>
      {node}
      <div className="text-[10px] font-bold uppercase tracking-wide mt-3 mb-1.5 text-[#2D6A4F]">{barriersCap}</div>
      {barriers.length === 0
        ? <div className="border border-dashed border-gray-200 rounded-lg py-2 text-center text-[11px] text-gray-400">Aucune</div>
        : <div className="flex flex-col gap-1.5">{barriers.map((b, i) => <BarrierChip key={i} b={b} />)}</div>}
    </div>
  )
}

function BarrierChip({ b }: { b: Barrier }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px]">
      {b.type === 'control' ? <Shield size={12} className="text-forest-700 shrink-0" /> : <FileText size={12} className="text-[#6D5AE6] shrink-0" />}
      <span className="truncate max-w-[130px]">{b.label}</span>
      <span className="ml-auto text-gray-400">{kindLabel(b.kind)}</span>
      <span className="font-semibold" style={{ color: expColor(100 - pct(b.effectiveness)) }}>{pct(b.effectiveness)}%</span>
    </span>
  )
}
