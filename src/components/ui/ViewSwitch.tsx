export type ViewMode = 'kanban' | 'split' | 'cards'

interface ViewSwitchProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

const views: { mode: ViewMode; icon: string; title: string }[] = [
  { mode: 'kanban', icon: '\u2637', title: 'Pipeline' },
  { mode: 'cards', icon: '\u2B1A', title: 'Cartes' },
  { mode: 'split', icon: '\u2261', title: 'Liste' },
]

export function ViewSwitch({ value, onChange }: ViewSwitchProps) {
  return (
    <div className="flex gap-0.5 rounded-lg border border-gray-200 bg-white p-[3px]">
      {views.map((v) => (
        <button
          key={v.mode}
          onClick={() => onChange(v.mode)}
          title={v.title}
          className={`flex h-8 w-8 items-center justify-center rounded-md text-[14px] transition-colors ${
            value === v.mode
              ? 'bg-forest-700 text-white'
              : 'text-gray-300 hover:bg-forest-50 hover:text-forest-700'
          }`}
        >
          {v.icon}
        </button>
      ))}
    </div>
  )
}
