import { Bold, Italic, List, Code } from 'lucide-react'
import type { RefObject } from 'react'

interface MarkdownToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement>
  onChange: (value: string) => void
  disabled?: boolean
}

interface WrapAction {
  prefix: string
  suffix: string
  placeholder: string
}

interface PrefixAction {
  linePrefix: string
}

type Action = WrapAction | PrefixAction

const ACTIONS: Array<{ key: string; icon: typeof Bold; title: string; action: Action }> = [
  { key: 'bold', icon: Bold, title: 'Gras (Ctrl+B)', action: { prefix: '**', suffix: '**', placeholder: 'gras' } },
  { key: 'italic', icon: Italic, title: 'Italique (Ctrl+I)', action: { prefix: '*', suffix: '*', placeholder: 'italique' } },
  { key: 'code', icon: Code, title: 'Code inline', action: { prefix: '`', suffix: '`', placeholder: 'code' } },
  { key: 'list', icon: List, title: 'Liste &agrave; puces', action: { linePrefix: '- ' } },
]

function applyWrap(textarea: HTMLTextAreaElement, action: WrapAction): { value: string; selStart: number; selEnd: number } {
  const value = textarea.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = value.slice(start, end)
  const insertion = selected.length > 0 ? selected : action.placeholder
  const newValue = value.slice(0, start) + action.prefix + insertion + action.suffix + value.slice(end)
  const cursorStart = start + action.prefix.length
  const cursorEnd = cursorStart + insertion.length
  return { value: newValue, selStart: cursorStart, selEnd: cursorEnd }
}

function applyLinePrefix(textarea: HTMLTextAreaElement, prefix: string): { value: string; selStart: number; selEnd: number } {
  const value = textarea.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const lineEnd = (() => {
    const next = value.indexOf('\n', end)
    return next < 0 ? value.length : next
  })()
  const block = value.slice(lineStart, lineEnd)
  const lines = block.split('\n')
  const allHavePrefix = lines.every((l) => l.startsWith(prefix))
  const transformed = allHavePrefix
    ? lines.map((l) => l.slice(prefix.length)).join('\n')
    : lines.map((l) => prefix + l).join('\n')
  const newValue = value.slice(0, lineStart) + transformed + value.slice(lineEnd)
  const delta = transformed.length - block.length
  return { value: newValue, selStart: lineStart, selEnd: lineEnd + delta }
}

export function MarkdownToolbar({ textareaRef, onChange, disabled }: MarkdownToolbarProps) {
  const apply = (action: Action) => {
    const ta = textareaRef.current
    if (!ta || disabled) return
    const result = 'linePrefix' in action
      ? applyLinePrefix(ta, action.linePrefix)
      : applyWrap(ta, action)
    onChange(result.value)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(result.selStart, result.selEnd)
    })
  }

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border border-gray-200 border-b-0 rounded-t-lg bg-gray-50">
      {ACTIONS.map(({ key, icon: Icon, title, action }) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => apply(action)}
          title={title}
          className="p-1.5 text-gray-600 hover:bg-white hover:text-forest-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Icon size={12} />
        </button>
      ))}
      <span className="ml-auto text-[9px] text-gray-400 italic">Markdown : **gras** *italique* `code` - liste</span>
    </div>
  )
}
