import { GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SECTION_CATALOG } from '../reports/audit-report-v2/section-catalog'

interface Props {
  rowKey: string
  title: string
  visible: boolean
  options: Record<string, unknown>
  onToggleVisible: () => void
  onOption: (key: string, value: unknown) => void
}

// Ligne de section de l'editeur : poignee de glisser-deposer (dnd-kit, accessible
// clavier via les capteurs du modal) + visibilite + controles d'options GENERES
// depuis le schema declaratif du catalogue (E1).
export function TemplateSectionRow({ rowKey, title, visible, options, onToggleVisible, onOption }: Props): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rowKey })
  const defs = SECTION_CATALOG.find((c) => c.key === rowKey)?.options ?? []
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="px-3 py-2 bg-white">
      <div className="flex items-center gap-2">
        <button type="button" {...attributes} {...listeners}
          className="cursor-grab touch-none text-gray-300 hover:text-gray-500" aria-label="Déplacer la section">
          <GripVertical size={14} />
        </button>
        <input type="checkbox" checked={visible} onChange={onToggleVisible} />
        <span className={`flex-1 text-[13px] ${visible ? 'text-gray-900' : 'text-gray-300 line-through'}`}>{title}</span>
      </div>
      {visible && defs.length > 0 && (
        <div className="mt-1.5 ml-11 flex flex-wrap gap-x-4 gap-y-1">
          {defs.map((d) => d.type === 'toggle' ? (
            <label key={d.key} className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <input type="checkbox" checked={options[d.key] !== false} onChange={(e) => onOption(d.key, e.target.checked)} /> {d.label}
            </label>
          ) : (
            <label key={d.key} className="flex items-center gap-1.5 text-[11px] text-gray-600">
              {d.label}
              <input type="number" min={d.min} max={d.max}
                value={typeof options[d.key] === 'number' ? (options[d.key] as number) : d.default}
                onChange={(e) => onOption(d.key, Math.max(d.min, Math.min(d.max, Number(e.target.value) || d.default)))}
                className="w-14 px-1.5 py-0.5 border border-gray-200 rounded" />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
