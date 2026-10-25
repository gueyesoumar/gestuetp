import { ArrowUp, ArrowDown } from 'lucide-react'
import { SECTION_CATALOG } from '../reports/audit-report-v2/section-catalog'

interface Props {
  rowKey: string
  title: string
  visible: boolean
  options: Record<string, unknown>
  isFirst: boolean
  isLast: boolean
  onToggleVisible: () => void
  onMove: (d: -1 | 1) => void
  onOption: (key: string, value: unknown) => void
}

// Ligne de section de l'editeur : visibilite + reordonnancement + controles d'options
// GENERES depuis le schema declaratif du catalogue (E1).
export function TemplateSectionRow({ rowKey, title, visible, options, isFirst, isLast, onToggleVisible, onMove, onOption }: Props): JSX.Element {
  const defs = SECTION_CATALOG.find((c) => c.key === rowKey)?.options ?? []
  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={visible} onChange={onToggleVisible} />
        <span className={`flex-1 text-[13px] ${visible ? 'text-gray-900' : 'text-gray-300 line-through'}`}>{title}</span>
        <button onClick={() => onMove(-1)} disabled={isFirst} className="text-gray-400 hover:text-gray-700 disabled:opacity-20"><ArrowUp size={14} /></button>
        <button onClick={() => onMove(1)} disabled={isLast} className="text-gray-400 hover:text-gray-700 disabled:opacity-20"><ArrowDown size={14} /></button>
      </div>
      {visible && defs.length > 0 && (
        <div className="mt-1.5 ml-6 flex flex-wrap gap-x-4 gap-y-1">
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
