import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TemplateSectionRow } from './TemplateSectionRow'

export interface Row { key: string; title: string; visible: boolean; options: Record<string, unknown> }

interface Props {
  rows: Row[]
  onReorder: (rows: Row[]) => void
  onToggle: (index: number) => void
  onOption: (index: number, key: string, value: unknown) => void
}

// Liste des sections du modele : glisser-deposer (dnd-kit) + capteurs pointeur ET
// clavier pour l'accessibilite. Extraite du modal pour tenir la limite de taille.
export function TemplateSectionsList({ rows, onReorder, onToggle, onOption }: Props): JSX.Element {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = (e: DragEndEvent): void => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = rows.findIndex((r) => r.key === active.id)
    const to = rows.findIndex((r) => r.key === over.id)
    if (from < 0 || to < 0) return
    onReorder(arrayMove(rows, from, to))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={rows.map((r) => r.key)} strategy={verticalListSortingStrategy}>
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-50 overflow-hidden">
          {rows.map((row, i) => (
            <TemplateSectionRow key={row.key} rowKey={row.key} title={row.title} visible={row.visible}
              options={row.options} onToggleVisible={() => onToggle(i)} onOption={(k, v) => onOption(i, k, v)} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
