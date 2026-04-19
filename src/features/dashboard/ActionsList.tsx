import { Badge } from '../../components/ui/Badge'

interface Action {
  id: string
  text: string
  priority: 'urgent' | 'todo' | 'planning' | 'info'
}

const priorityConfig: Record<string, { label: string; variant: 'red' | 'gold' | 'forest' | 'gray'; dotColor: string }> = {
  urgent: { label: 'Urgent', variant: 'red', dotColor: 'bg-error' },
  todo: { label: '\u00c0 faire', variant: 'gold', dotColor: 'bg-gold-500' },
  planning: { label: 'Planif.', variant: 'forest', dotColor: 'bg-forest-500' },
  info: { label: 'Info', variant: 'gray', dotColor: 'bg-forest-300' },
}

interface ActionsListProps {
  actions: Action[]
}

export function ActionsList({ actions }: ActionsListProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h4 className="text-[14px] font-bold text-gray-900 mb-3">Actions prioritaires</h4>
      {actions.length === 0 ? (
        <p className="text-[13px] text-gray-400">Aucune action en attente.</p>
      ) : (
        <div>
          {actions.map((a) => {
            const cfg = priorityConfig[a.priority]
            return (
              <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
                <div className="flex-1 text-[13px] text-gray-700" dangerouslySetInnerHTML={{ __html: a.text }} />
                <Badge label={cfg.label} variant={cfg.variant} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
