const covColor = (s: number): string => (s >= 80 ? '#16A34A' : s >= 60 ? '#D4A843' : '#DC2626')

/**
 * Couverture honnête d'une entité : score de conformité %, « En cours » (mission
 * ouverte mais pas encore de score), ou « À évaluer » (jamais contrôlée).
 * Partagé carte + tableau du registre.
 */
export function SubsidiaryCoverage({ score, activeMissions }: { score: number | null; activeMissions: number }): JSX.Element {
  if (score !== null) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="h-1.5 w-12 overflow-hidden rounded-full bg-gray-100">
          <span className="block h-full rounded-full" style={{ width: `${score}%`, background: covColor(score) }} />
        </span>
        <span className="font-mono text-[12.5px] font-bold" style={{ color: covColor(score) }}>{score}%</span>
      </span>
    )
  }
  if (activeMissions > 0) return <span className="text-[12px] font-semibold text-gold-600">En cours</span>
  return <span className="text-[12px] font-semibold text-gold-600">À évaluer</span>
}
