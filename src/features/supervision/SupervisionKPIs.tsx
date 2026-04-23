import type { EntityScore } from './useSupervisionData'

interface SupervisionKPIsProps {
  entities: EntityScore[]
}

export function SupervisionKPIs({ entities }: SupervisionKPIsProps) {
  const totalEntities = entities.length
  const avgScore = totalEntities > 0
    ? Math.round(entities.reduce((s, e) => s + e.globalScore, 0) / totalEntities)
    : 0
  const totalMajorNc = entities.reduce((s, e) => s + e.majorNcCount, 0)
  const conformCount = entities.filter((e) => e.globalScore >= 80).length
  const partialCount = entities.filter((e) => e.globalScore >= 60 && e.globalScore < 80).length
  const nonConformCount = entities.filter((e) => e.globalScore < 60).length

  const scoreColor = avgScore >= 80 ? 'text-emerald-600' : avgScore >= 60 ? 'text-gold-500' : 'text-red-600'
  const scoreBarColor = avgScore >= 80 ? 'bg-emerald-500' : avgScore >= 60 ? 'bg-gold-500' : 'bg-red-400'

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <Card title="Entit&eacute;s audit&eacute;es">
        <div className="mt-2 flex items-end gap-2">
          <span className="text-3xl font-extrabold text-gray-900">{totalEntities}</span>
        </div>
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {conformCount > 0 && <MiniTag label={`${conformCount} conformes`} cls="bg-emerald-100 text-emerald-700" />}
          {partialCount > 0 && <MiniTag label={`${partialCount} partiels`} cls="bg-amber-100 text-amber-700" />}
          {nonConformCount > 0 && <MiniTag label={`${nonConformCount} non conformes`} cls="bg-red-100 text-red-700" />}
        </div>
      </Card>

      <Card title="Conformit&eacute; moyenne">
        <div className="mt-2 flex items-end gap-2">
          <span className={`text-3xl font-extrabold ${scoreColor}`}>{avgScore}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
          <div className={`h-full rounded-full ${scoreBarColor} transition-all`} style={{ width: `${avgScore}%` }} />
        </div>
        <div className="mt-1 text-[10px] text-gray-400">Seuil cible : 80%</div>
      </Card>

      <Card title="NC majeures ouvertes">
        <div className="mt-2 flex items-end gap-2">
          <span className={`text-3xl font-extrabold ${totalMajorNc > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{totalMajorNc}</span>
        </div>
      </Card>

      <Card title="Couverture des domaines">
        <div className="mt-2 flex items-end gap-2">
          <span className="text-3xl font-extrabold text-forest-700">
            {totalEntities > 0 ? Math.round((entities.filter((e) => e.totalControls > 0).length / totalEntities) * 100) : 0}%
          </span>
        </div>
        <div className="mt-1 text-[10px] text-gray-400">Entit&eacute;s avec contr&ocirc;les &eacute;valu&eacute;s</div>
      </Card>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{title}</div>
      {children}
    </div>
  )
}

function MiniTag({ label, cls }: { label: string; cls: string }) {
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
}
