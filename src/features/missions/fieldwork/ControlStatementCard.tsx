interface ControlStatementCardProps {
  description: string | null
  guidance: string | null
}

/**
 * Énoncé du contrôle (rendu dans la section Contexte du rail) : la description de
 * l'exigence + l'objectif d'audit. L'identité (code, verdict, risque) et le pliage
 * sont déjà portés par la carte résumé et la section du rail — on ne les répète pas.
 */
export function ControlStatementCard({ description, guidance }: ControlStatementCardProps) {
  if (!description && !guidance) return null

  return (
    <div className="space-y-2">
      {description && (
        <p className="text-[13px] text-gray-700 leading-relaxed">{description}</p>
      )}
      {guidance && (
        <div>
          <p className="text-[10px] uppercase tracking-wide font-bold text-gray-500 mb-1">Objectif d&apos;audit</p>
          <p className="text-[12px] text-gray-700 leading-relaxed">{guidance}</p>
        </div>
      )}
    </div>
  )
}
