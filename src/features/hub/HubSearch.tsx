/**
 * HubSearch - command palette du Hub (RFC Hub UX). Champ dans le hero + popover de
 * résultats groupés (modules / missions / assujettis), navigation directe au clavier.
 * ⌘K/Ctrl+K met le focus sur le champ. Données cloisonnées par la RLS (useHubSearch).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import type { HubProduct } from '../../lib/hubProducts'
import { useVocab } from '../edition/useVocab'
import { useHubSearch } from './useHubSearch'

interface HubSearchProps {
  products: HubProduct[]
  isEnterable: (p: HubProduct) => boolean
  onOpen: (p: HubProduct) => void
}

interface Row { key: string; group: string; label: string; sublabel?: string; run: () => void }

export function HubSearch({ products, isEnterable, onOpen }: HubSearchProps): JSX.Element {
  const navigate = useNavigate()
  const vocab = useVocab()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const { missions, entities, loading } = useHubSearch(query)

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const close = (): void => { setOpen(false); setQuery('') }
    const mods: Row[] = products.filter(isEnterable)
      .filter((p) => p.name.toLowerCase().includes(q) || p.title.toLowerCase().includes(q))
      .map((p) => ({ key: `mod-${p.name}`, group: 'Modules', label: p.name, sublabel: p.title, run: () => { close(); onOpen(p) } }))
    const miss: Row[] = missions.map((m) => ({ key: `mis-${m.id}`, group: vocab.missionTerm, label: m.label, run: () => { close(); navigate(`${vocab.missionRouteBase}/${m.id}`) } }))
    const ents: Row[] = entities.map((e) => ({ key: `ent-${e.id}`, group: vocab.entitiesTitle, label: e.label, sublabel: e.sublabel, run: () => { close(); navigate(`${vocab.entityRouteBase}/${e.id}`) } }))
    return [...mods, ...miss, ...ents]
  }, [query, products, isEnterable, onOpen, missions, entities, vocab, navigate])

  useEffect(() => { setActive(0) }, [rows.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const onKeyDown = useCallback((e: ReactKeyboardEvent): void => {
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); return }
    if (!rows.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, rows.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); rows[active]?.run() }
  }, [rows, active])

  const showPopover = open && query.trim().length >= 2

  return (
    <div ref={boxRef} className="relative mx-auto w-full max-w-[460px]">
      <div className="flex items-center gap-2.5 rounded-xl border border-[rgb(var(--hub-fg)/0.16)] bg-[rgb(var(--hub-fg)/0.06)] px-3.5 py-2.5 transition-shadow focus-within:border-[#D4A843] focus-within:shadow-[0_0_0_3px_rgba(212,168,67,0.22)]">
        <Search size={17} className="shrink-0 text-[rgb(var(--hub-fg)/0.6)]" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showPopover}
          aria-controls="hub-search-results"
          placeholder="Rechercher un module, une mission, un assujetti..."
          className="min-w-0 flex-1 bg-transparent text-[14px] text-[rgb(var(--hub-fg))] outline-none placeholder:text-[rgb(var(--hub-fg)/0.5)]"
        />
        <kbd className="shrink-0 rounded-md border border-[rgb(var(--hub-fg)/0.18)] px-1.5 py-0.5 font-mono text-[11px] text-[rgb(var(--hub-fg)/0.6)]">⌘K</kbd>
      </div>

      {showPopover && (
        <div
          id="hub-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-2 max-h-[320px] overflow-y-auto rounded-xl border border-[rgb(var(--hub-fg)/0.15)] bg-[#16281F] p-2 text-left shadow-[0_18px_44px_rgba(0,0,0,0.5)]"
        >
          {rows.length === 0 ? (
            <p className="px-2.5 py-3 text-[13px] text-[rgb(var(--hub-fg)/0.6)]">{loading ? 'Recherche...' : 'Aucun résultat.'}</p>
          ) : (
            rows.map((r, i) => (
              <div key={r.key}>
                {(i === 0 || rows[i - 1].group !== r.group) && (
                  <p className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--hub-fg)/0.55)]">{r.group}</p>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={active === i}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={r.run}
                  className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${active === i ? 'bg-[rgb(var(--hub-fg)/0.1)] text-[rgb(var(--hub-fg))]' : 'text-[rgb(var(--hub-fg)/0.8)]'}`}
                >
                  <span className="flex-1 truncate">{r.label}</span>
                  {r.sublabel && <span className="shrink-0 truncate text-[12px] text-[rgb(var(--hub-fg)/0.5)]">{r.sublabel}</span>}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
