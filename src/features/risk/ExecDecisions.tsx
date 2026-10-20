import type { SupervisorDirective } from './useSupervisorDirectives'

const today = (): string => new Date().toISOString().slice(0, 10)

/** « Ce qui requiert un arbitrage » : décisions attendues, en langage dirigeant. */
export function ExecDecisions({ directives, overdueReviews }: { directives: SupervisorDirective[]; overdueReviews: number }): JSX.Element {
  const t = today()
  const pending = directives.filter((d) => d.verification_status === 'pending')
  const late = pending.filter((d) => d.due_date && d.due_date < t)

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="px-4 py-3 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">Ce qui requiert un arbitrage</h3></div>
      <div className="divide-y divide-gray-100">
        <Item n={late.length} accent="#C0392B" title="Failles signalées non corrigées" desc="Correctifs demandés non traités dans les délais." />
        <Item n={overdueReviews} accent="#B8860B" title="Contrôles de sécurité à refaire" desc="Vérifications de risque en retard sur le portefeuille." />
        <Item muted title="Risques tolérés à revoir" desc="Suivi des tolérances de risque arrivant à expiration. Disponible prochainement." />
      </div>
    </div>
  )
}

function Item({ n, accent, title, desc, muted }: { n?: number; accent?: string; title: string; desc: string; muted?: boolean }): JSX.Element {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5" style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}>
      <span className={`font-mono font-bold text-[20px] ${muted ? 'text-gray-300' : 'text-[#9C7A1F]'}`}>{muted ? '-' : n}</span>
      <div className="min-w-0">
        <div className={`text-[13.5px] font-bold ${muted ? 'text-gray-400' : 'text-gray-900'}`}>{title}</div>
        <div className="text-[12px] text-gray-500 mt-0.5">{desc}</div>
      </div>
    </div>
  )
}
