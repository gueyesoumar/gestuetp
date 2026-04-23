import { useState, useRef, useEffect } from 'react'
import { Info, X } from 'lucide-react'

interface InfoPopoverProps {
  text: string
}

export function InfoPopover({ text }: InfoPopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-5 h-5 rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Informations"
      >
        <Info size={13} />
      </button>

      {open && (
        <div className="absolute top-7 right-0 z-20 w-64 rounded-lg border border-gray-200 bg-white p-3.5 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] text-gray-600 leading-relaxed">{text}</p>
            <button
              onClick={() => setOpen(false)}
              className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
