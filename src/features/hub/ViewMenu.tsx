import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { HubPerspective } from './useHubPerspectives'

// Sélecteur de perspective sous forme de menu déroulant « Vue ▾ » (header, à
// droite). N'apparaît que si au moins 2 perspectives sont disponibles.

const LABELS: Record<HubPerspective, { t: string; sub: string }> = {
  self: { t: 'Mon organisation', sub: 'Votre score de confiance' },
  clients: { t: 'Portefeuille clients', sub: 'Score par client audité' },
  group: { t: 'Groupe / filiales', sub: 'Score par filiale' },
}

interface ViewMenuProps {
  perspectives: HubPerspective[]
  value: HubPerspective
  onChange: (p: HubPerspective) => void
}

export function ViewMenu({ perspectives, value, onChange }: ViewMenuProps): JSX.Element | null {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (perspectives.length < 2) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/[0.07]"
      >
        <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-white/40">Vue</span>
        {LABELS[value].t}
        <ChevronDown size={14} className={`text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[232px] rounded-2xl border border-white/15 bg-[#0d2a1e] p-1.5 shadow-2xl">
          {perspectives.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { onChange(p); setOpen(false) }}
              className={`flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold ${p === value ? 'text-[#E2C26B]' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            >
              {LABELS[p].t}
              <span className="mt-0.5 font-mono text-[9px] font-normal tracking-[0.04em] text-white/40">{LABELS[p].sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
