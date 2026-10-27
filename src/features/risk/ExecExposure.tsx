import type { ExposureDist } from './execSynthesis'

const PILL: Record<string, string> = {
  crit: 'bg-red-50 text-red-700 border-red-200',
  warn: 'bg-amber-50 text-amber-700 border-amber-200',
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

interface Props {
  exposure: number
  posture: { label: string; tone: 'crit' | 'warn' | 'ok' }
  dist: ExposureDist
}

/** Carte « Niveau d'exposition » : exposition moyenne nationale (ISO 27005), barre
 *  graduée et répartition des institutions par niveau. */
export function ExecExposure({ exposure, posture, dist }: Props): JSX.Element {
  const rows: { label: string; count: number; color: string }[] = [
    { label: 'Maîtrisé', count: dist.maitrise, color: '#27AE60' },
    { label: 'Vigilance', count: dist.vigilance, color: '#D68910' },
    { label: 'Critique', count: dist.critique, color: '#C0392B' },
    { label: 'Non évaluées', count: dist.nonEvalue, color: '#9CA3AF' },
  ]
  const denom = Math.max(dist.total, 1)
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-[13px] font-bold text-gray-900">Niveau d&apos;exposition</h3>
      <div className="flex items-center gap-5 mt-3 flex-wrap">
        <div className="font-mono font-bold text-[40px] leading-none text-gray-900">{exposure}<span className="text-[16px] text-gray-400">/100</span></div>
        <div className="flex-1 min-w-[200px]">
          <div className="relative flex h-2.5 rounded-full overflow-hidden border border-gray-200">
            <span className="h-full" style={{ width: '30%', background: '#EAF4EE' }} />
            <span className="h-full" style={{ width: '25%', background: '#F7F0E1' }} />
            <span className="h-full" style={{ width: '45%', background: '#F7EAE8' }} />
            <span className="absolute -top-1 w-0.5 h-[18px] bg-gray-900 rounded" style={{ left: `${exposure}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 font-semibold mt-1.5"><span>Maîtrisé</span><span>Critique</span></div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded border ${PILL[posture.tone]}`}>{posture.label}</span>
        <span className="text-[11px] text-gray-400">Historique (tendance) à venir</span>
      </div>
      <p className="text-[11.5px] text-gray-500 mt-3">Exposition au risque de l&apos;ensemble des institutions suivies (vraisemblance x impact). Plus le chiffre est haut, plus les institutions sont exposées.</p>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">Répartition des institutions</p>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-2.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
              <span className="text-[12px] text-gray-600 w-[92px] shrink-0">{r.label}</span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(r.count / denom) * 100}%`, background: r.color, opacity: 0.85 }} />
              </div>
              <span className="text-[12.5px] font-bold text-gray-900 w-6 text-right tabular-nums shrink-0">{r.count}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-3">{dist.total} institution{dist.total !== 1 ? 's' : ''} suivie{dist.total !== 1 ? 's' : ''}.</p>
      </div>
    </div>
  )
}
