import { AlertCircle, Upload, CheckSquare, Calendar, FileWarning } from 'lucide-react'

interface ActionItem {
  type: 'document' | 'validation' | 'interview' | 'car'
  label: string
  sublabel: string
  count?: number
}

interface ClientActionsListProps {
  docsPending: number
  findingsPending: number
  interviewsPending: number
  carsPending: number
  totalPending: number
  onNavigate: (tab: string) => void
}

export function ClientActionsList({
  docsPending, findingsPending, interviewsPending, carsPending, totalPending, onNavigate,
}: ClientActionsListProps): JSX.Element {
  const actions: ActionItem[] = []

  if (docsPending > 0) {
    actions.push({
      type: 'document',
      label: `Fournir ${docsPending} document${docsPending > 1 ? 's' : ''} attendu${docsPending > 1 ? 's' : ''}`,
      sublabel: 'Documents demand\u00e9s par les auditeurs',
    })
  }
  if (findingsPending > 0) {
    actions.push({
      type: 'validation',
      label: `Valider ${findingsPending} constat${findingsPending > 1 ? 's' : ''} en revue client`,
      sublabel: 'Constats soumis pour votre validation',
    })
  }
  if (carsPending > 0) {
    actions.push({
      type: 'car',
      label: `R\u00e9pondre \u00e0 ${carsPending} demande${carsPending > 1 ? 's' : ''} d\u2019action corrective`,
      sublabel: 'Actions correctives en attente de votre r\u00e9ponse',
    })
  }
  if (interviewsPending > 0) {
    actions.push({
      type: 'interview',
      label: `${interviewsPending} entretien${interviewsPending > 1 ? 's' : ''} \u00e0 venir`,
      sublabel: 'Entretiens planifi\u00e9s avec l\u2019\u00e9quipe d\u2019audit',
    })
  }

  if (actions.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={15} className="text-gray-300" />
          <span className="text-[13px] font-semibold text-gray-700">Actions requises</span>
        </div>
        <p className="text-xs text-gray-300 text-center py-3">Aucune action en attente pour le moment.</p>
      </div>
    )
  }

  const iconMap = {
    document: <Upload size={14} />,
    validation: <CheckSquare size={14} />,
    interview: <Calendar size={14} />,
    car: <FileWarning size={14} />,
  }

  const tabMap: Record<string, string> = {
    document: 'exchanges',
    validation: 'results',
    interview: 'exchanges',
    car: 'results',
  }

  const buttonLabelMap: Record<string, string> = {
    document: 'D\u00e9poser',
    validation: 'Voir',
    interview: 'Voir',
    car: 'R\u00e9pondre',
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5" style={{ borderLeft: '3px solid var(--color-gold-500)' }}>
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle size={15} className="text-gold-500" />
        <span className="text-[13px] font-semibold text-gray-700">Actions requises</span>
        <span className="ml-auto text-[10px] font-medium text-gold-600 bg-gold-50 px-2 py-0.5 rounded-full">
          {totalPending} en attente
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {actions.map((action) => (
          <div key={action.type} className="flex items-center gap-3 p-3 bg-gold-50 border border-gold-200 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-gold-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-gray-900">{action.label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{action.sublabel}</p>
            </div>
            <button
              onClick={() => onNavigate(tabMap[action.type])}
              className="px-3 py-1.5 bg-forest-700 text-white border-none rounded-lg text-[11px] font-medium shrink-0 hover:bg-forest-900 transition-colors"
            >
              {buttonLabelMap[action.type]}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
