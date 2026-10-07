import { useEffect } from 'react'
import type { AssessmentWithControl } from '../useAuditorAssessments'

interface UseFieldworkShortcutsArgs {
  assessments: AssessmentWithControl[]
  selectedId: string | null
  enabled: boolean
  onSelectControl: (controlId: string) => void
  onSave: () => void | Promise<void>
  onSubmit?: () => void | Promise<void>
  onShowHelp: () => void
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}

export function useFieldworkShortcuts({
  assessments,
  selectedId,
  enabled,
  onSelectControl,
  onSave,
  onSubmit,
  onShowHelp,
}: UseFieldworkShortcutsArgs): void {
  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent): void => {
      const ctrlOrMeta = e.metaKey || e.ctrlKey
      const editable = isEditableTarget(e.target)

      // ⌘/Ctrl + S → save (override browser save)
      if (ctrlOrMeta && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void onSave()
        return
      }

      // ⌘/Ctrl + Enter → soumettre
      if (ctrlOrMeta && e.key === 'Enter') {
        e.preventDefault()
        if (onSubmit) void onSubmit()
        return
      }

      // ⌘/Ctrl + J / K → next/prev control
      if (ctrlOrMeta && (e.key.toLowerCase() === 'j' || e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        if (assessments.length === 0) return
        const idx = assessments.findIndex((a) => a.control_id === selectedId)
        const dir = e.key.toLowerCase() === 'j' ? 1 : -1
        const nextIdx = idx === -1 ? 0 : (idx + dir + assessments.length) % assessments.length
        onSelectControl(assessments[nextIdx].control_id)
        return
      }

      // ? → aide
      if (!editable && e.key === '?') {
        e.preventDefault()
        onShowHelp()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, assessments, selectedId, onSelectControl, onSave, onSubmit, onShowHelp])
}
