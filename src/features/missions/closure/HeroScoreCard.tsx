interface HeroScoreCardProps {
  score: number
  /** Nombre de contrôles strictement conformes (conformity_level = 'c'). */
  conformes: number
  totalControls: number
}

export function HeroScoreCard({ score, conformes, totalControls }: HeroScoreCardProps){
  const color = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="relative text-center py-10 bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-forest-500 to-gold-500" />
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Score de conformit&eacute;</p>
      <p className={`text-[64px] font-extrabold leading-none mt-3 mb-2 ${color}`}>{score}%</p>
      <p className="text-sm text-gray-500">{conformes} contr&ocirc;les strictement conformes sur {totalControls}</p>
    </div>
  )
}
