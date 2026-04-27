import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Info, X } from 'lucide-react'

interface InfoPopoverProps {
  text: string
}

export function InfoPopover({ text }: InfoPopoverProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent): void => {
      const target = e.target as Node
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        popRef.current && !popRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
    }
    setOpen((v) => !v)
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex items-center justify-center w-5 h-5 rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Informations"
      >
        <Info size={13} />
      </button>
      {open && pos && createPortal(
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, right: pos.right }}
          className="z-[60] w-64 rounded-lg border border-gray-200 bg-white p-3.5 shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] text-gray-600 leading-relaxed">{text}</p>
            <button
              onClick={() => setOpen(false)}
              className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
