import type { Framework } from '../../../types/database.types'

interface MissionTypeStepProps {
  frameworks: Framework[]
  selectedFrameworkId: string
  onSelect: (id: string) => void
}

const typeCards: { category: string; label: string; description: string; icon: { abbr: string; bg: string } }[] = [
  { category: 'conformite', label: 'Audit de conformité', description: 'Vérifier la conformité à un référentiel standard de sécurité de l\'information', icon: { abbr: 'ISO', bg: 'bg-forest-100 text-forest-700' } },
  { category: 'audit-si', label: 'Audit SI', description: 'Audit complet du système d\'information : gouvernance, risques, services, sécurité', icon: { abbr: 'Gë', bg: 'bg-forest-900 text-gold-500' } },
  { category: 'due-diligence', label: 'Due diligence technique', description: 'Évaluer la maturité technique d\'une startup/PME pour un investisseur', icon: { abbr: 'Gë', bg: 'bg-forest-900 text-gold-500' } },
  { category: 'evaluation', label: 'Évaluation maturité digitale', description: 'Mesurer le niveau de maturité numérique d\'une organisation', icon: { abbr: 'Gë', bg: 'bg-forest-900 text-gold-500' } },
]

const frameworkByCategory: Record<string, string[]> = {
  'conformite': ['iso-27001', 'nist-csf'],
  'audit-si': ['audit-si'],
  'due-diligence': ['due-diligence-tech'],
  'evaluation': ['maturite-digitale'],
}

export function MissionTypeStep({ frameworks, selectedFrameworkId, onSelect }: MissionTypeStepProps) {
  const getFrameworksForCategory = (category: string) => {
    const slugs = frameworkByCategory[category] ?? []
    return frameworks.filter((f) => slugs.includes(f.slug))
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900">Quel type de mission souhaitez-vous créer ?</h3>
      <p className="mt-1 text-[13px] text-gray-500">Sélectionnez le type qui déterminera le référentiel et l'approche</p>

      <div className="mt-5 grid grid-cols-2 gap-3.5">
        {typeCards.map((card) => {
          const fws = getFrameworksForCategory(card.category)
          const isSelected = fws.some((f) => f.id === selectedFrameworkId)

          return (
            <div key={card.category} className="space-y-2">
              {fws.length === 1 ? (
                <TypeCard
                  card={card}
                  framework={fws[0]}
                  selected={isSelected}
                  onClick={() => onSelect(fws[0].id)}
                />
              ) : (
                fws.map((fw) => (
                  <TypeCard
                    key={fw.id}
                    card={card}
                    framework={fw}
                    selected={fw.id === selectedFrameworkId}
                    onClick={() => onSelect(fw.id)}
                  />
                ))
              )}
              {fws.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-gray-200 p-5 text-center text-[12px] text-gray-300">
                  {card.label} — bientôt disponible
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TypeCard({ card, framework, selected, onClick }: {
  card: typeof typeCards[number]
  framework: Framework
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left rounded-xl border-2 p-5 transition-all ${
        selected
          ? 'border-forest-700 bg-forest-50'
          : 'border-gray-200 hover:border-forest-300'
      }`}
    >
      {selected && (
        <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-forest-700 text-[10px] text-white">✓</span>
      )}
      <div className={`flex h-9 w-9 items-center justify-center rounded-[10px] text-[12px] font-extrabold ${card.icon.bg}`}>
        {card.icon.abbr}
      </div>
      <div className="mt-2.5 text-[14px] font-bold text-gray-900">{card.label}</div>
      <div className="mt-0.5 text-[11px] text-gray-300">
        {framework.name} {framework.version ? `v${framework.version}` : ''}
      </div>
      <div className="mt-1.5 text-[12px] text-gray-500 leading-relaxed">{card.description}</div>
    </button>
  )
}
