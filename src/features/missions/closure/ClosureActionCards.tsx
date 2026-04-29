interface Action {
  key: 'pdf' | 'pptx' | 'plan' | 'archive'
  icon: string
  title: string
  desc: string
  iconBg: string
  iconColor: string
}

const ACTIONS: Action[] = [
  { key: 'pdf',     icon: '📄', title: 'Rapport PDF',              desc: 'Générer le rapport d’audit complet',          iconBg: 'bg-red-50',     iconColor: 'text-red-600' },
  { key: 'pptx',    icon: '📊', title: 'Présentation PowerPoint',  desc: 'Synthèse pour le comité de direction',        iconBg: 'bg-amber-50',   iconColor: 'text-amber-600' },
  { key: 'plan',    icon: '☑',       title: 'Plan d’action',            desc: 'Générer et suivre les actions de remédiation', iconBg: 'bg-forest-100', iconColor: 'text-forest-700' },
  { key: 'archive', icon: '🗃', title: 'Archiver la mission',      desc: 'Clôturer et archiver tous les documents',     iconBg: 'bg-gray-100',   iconColor: 'text-gray-500' },
]

interface ClosureActionCardsProps {
  /** État de chargement par action — affiche "En cours…" et désactive le bouton. */
  busy?: { pdf?: boolean; pptx?: boolean; plan?: boolean; archive?: boolean }
  /** Handlers — si non fourni, l'action est désactivée et marquée "Bientôt". */
  onGenerateAuditReport?: () => void | Promise<void>
  onGenerateExecutivePPT?: () => void | Promise<void>
  onOpenActionPlan?: () => void | Promise<void>
  onArchiveMission?: () => void | Promise<void>
}

export function ClosureActionCards({
  busy = {},
  onGenerateAuditReport,
  onGenerateExecutivePPT,
  onOpenActionPlan,
  onArchiveMission,
}: ClosureActionCardsProps): JSX.Element {
  const handlerOf: Record<Action['key'], (() => void | Promise<void>) | undefined> = {
    pdf: onGenerateAuditReport,
    pptx: onGenerateExecutivePPT,
    plan: onOpenActionPlan,
    archive: onArchiveMission,
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {ACTIONS.map((action) => {
        const handler = handlerOf[action.key]
        const isBusy = !!busy[action.key]
        const disabled = !handler || isBusy
        return (
          <button
            key={action.key}
            type="button"
            disabled={disabled}
            onClick={() => { if (handler) void handler() }}
            className={`flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 text-left transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-forest-300 hover:shadow-sm'}`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${action.iconBg} ${action.iconColor}`}>
              {action.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{action.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isBusy ? 'En cours…' : !handler ? 'Bientôt disponible' : action.desc}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
