const ACTIONS = [
  { icon: '\uD83D\uDCC4', title: 'Rapport PDF', desc: 'G\u00e9n\u00e9rer le rapport d\u2019audit complet', iconBg: 'bg-red-50', iconColor: 'text-red-600' },
  { icon: '\uD83D\uDCCA', title: 'Pr\u00e9sentation PowerPoint', desc: 'Synth\u00e8se pour le comit\u00e9 de direction', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  { icon: '\u2611', title: 'Plan d\u2019action', desc: 'G\u00e9n\u00e9rer les recommandations prioritaires', iconBg: 'bg-forest-100', iconColor: 'text-forest-700' },
  { icon: '\uD83D\uDDC3', title: 'Archiver la mission', desc: 'Cl\u00f4turer et archiver tous les documents', iconBg: 'bg-gray-100', iconColor: 'text-gray-500' },
] as const

export function ClosureActionCards(){
  return (
    <div className="grid grid-cols-2 gap-4">
      {ACTIONS.map((action) => (
        <button
          key={action.title}
          className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-forest-300 hover:shadow-sm transition-all"
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${action.iconBg} ${action.iconColor}`}>
            {action.icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{action.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
