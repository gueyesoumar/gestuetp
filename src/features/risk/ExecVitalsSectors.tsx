import { useMemo } from 'react'
import type { PortfolioOrg } from './useSupervisedPortfolio'

const barColor = (e: number): string => (e >= 60 ? '#C0392B' : e >= 30 ? '#B8860B' : '#27AE60')

/** Cartes « Infrastructures vitales de l'État » + « Secteurs les plus menacés ». */
export function ExecVitalsSectors({ orgs }: { orgs: PortfolioOrg[] }): JSX.Element {
  const { vitalCount, atRisk, avgVital, avgOther, sectors } = useMemo(() => {
    const vitals = orgs.filter((o) => o.is_iic)
    const others = orgs.filter((o) => !o.is_iic)
    const mean = (l: PortfolioOrg[]): number => (l.length ? Math.round(l.reduce((s, o) => s + o.avg_exposure, 0) / l.length) : 0)
    const bySec = new Map<string, PortfolioOrg[]>()
    orgs.forEach((o) => { const k = o.sector ?? 'Autre'; bySec.set(k, [...(bySec.get(k) ?? []), o]) })
    const secs = [...bySec.entries()]
      .map(([sector, list]) => ({ sector, avg: mean(list) }))
      .sort((a, b) => b.avg - a.avg).slice(0, 5)
    return { vitalCount: vitals.length, atRisk: vitals.filter((o) => o.above_threshold > 0).length, avgVital: mean(vitals), avgOther: mean(others), sectors: secs }
  }, [orgs])

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-4 py-3 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">Infrastructures vitales de l&apos;État</h3><p className="text-[11.5px] text-gray-500 mt-0.5">Eau, électricité, finances, télécoms, souveraineté.</p></div>
        <div className="px-4 py-4 grid grid-cols-2 gap-x-6 gap-y-4 items-center sm:grid-cols-[auto_auto_1fr]">
          <Stat n={vitalCount} label="Suivies" color="#1A1A1A" />
          <Stat n={atRisk} label="À risque élevé" color="#C0392B" />
          <div>
            <div className="text-[10px] uppercase tracking-wide font-bold text-gray-500 mb-2">Risque moyen</div>
            <Bar label="Vitales" value={avgVital} color="#C0392B" />
            <Bar label="Autres" value={avgOther} color="#27AE60" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-4 py-3 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">Secteurs les plus menacés</h3></div>
        <div className="px-4 py-4">
          {sectors.map((s) => <Bar key={s.sector} label={s.sector} value={s.avg} color={barColor(s.avg)} wide />)}
          {sectors.length === 0 && <p className="text-[12px] text-gray-400">Aucun secteur à afficher.</p>}
        </div>
      </div>
    </div>
  )
}

function Stat({ n, label, color }: { n: number; label: string; color: string }): JSX.Element {
  return <div><div className="font-mono text-[24px] font-bold leading-none" style={{ color }}>{n}</div><div className="text-[10px] uppercase tracking-wide font-bold text-gray-500 mt-1.5">{label}</div></div>
}

function Bar({ label, value, color, wide }: { label: string; value: number; color: string; wide?: boolean }): JSX.Element {
  return (
    <div className="flex items-center gap-2.5 text-[12px] mt-2 first:mt-0">
      <span className="text-gray-600 truncate" style={{ width: wide ? 120 : 64 }}>{label}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} /></div>
      <span className="font-mono text-gray-700 w-6 text-right">{value}</span>
    </div>
  )
}
