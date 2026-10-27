import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { NavItem } from './useSidebarNav'

interface Props {
  items: NavItem[]
  collapsed: boolean
  onNavigate: () => void
}

const STORE_KEY = 'gestu-sidebar-sections'
const readOpen = (): Set<string> => {
  try { const v = localStorage.getItem(STORE_KEY); if (v) return new Set(JSON.parse(v) as string[]) } catch { /* ignore */ }
  return new Set()
}
const matchActive = (to: string, pathname: string): boolean => pathname === to || pathname.startsWith(`${to}/`)

function NavRow({ item, collapsed, indent, onNavigate }: { item: NavItem; collapsed: boolean; indent?: boolean; onNavigate: () => void }): JSX.Element {
  return (
    <NavLink
      to={item.to} end={item.end ?? item.to === '/'} onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => collapsed
        ? `relative flex items-center justify-center w-11 h-11 mx-auto mb-1 rounded-xl transition-colors ${isActive ? 'bg-white/12 text-white' : 'text-white/40 hover:bg-white/8 hover:text-white/70'}`
        : `relative flex items-center gap-3 rounded-xl ${indent ? 'pl-8 pr-3.5' : 'px-3.5'} py-2.5 mb-0.5 text-[13px] font-medium transition-colors ${isActive ? 'bg-white/12 text-white' : 'text-white/45 hover:bg-white/8 hover:text-white/80'}`}
    >
      {({ isActive }) => (
        <>
          {isActive && <span className={`absolute top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gold-500 ${collapsed ? '-left-2' : 'left-0'}`} />}
          <span className="flex-shrink-0">{item.icon}</span>
          {!collapsed && <span>{item.label}</span>}
        </>
      )}
    </NavLink>
  )
}

/** Nav principale : liens directs + sections repliables (accordéon). La section de la
 *  page active s'ouvre toujours ; les autres bascules sont mémorisées (localStorage). */
export function SidebarMainNav({ items, collapsed, onNavigate }: Props): JSX.Element {
  const { pathname } = useLocation()
  const direct = items.filter((it) => !it.section)
  const sections: { label: string; items: NavItem[] }[] = []
  items.forEach((it) => {
    if (!it.section) return
    const g = sections.find((s) => s.label === it.section)
    if (g) g.items.push(it); else sections.push({ label: it.section, items: [it] })
  })
  const activeLabel = sections.find((s) => s.items.some((it) => matchActive(it.to, pathname)))?.label ?? null

  const [open, setOpen] = useState<Set<string>>(() => readOpen())
  // La section active est toujours ouverte (sans la persister).
  useEffect(() => { if (activeLabel) setOpen((p) => (p.has(activeLabel) ? p : new Set(p).add(activeLabel))) }, [activeLabel])

  const toggle = (label: string): void => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label); else next.add(label)
      try { localStorage.setItem(STORE_KEY, JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }

  return (
    <>
      {!collapsed && <p className="mb-2 px-3.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-white/30">Espace de travail</p>}
      {direct.map((it) => <NavRow key={it.to} item={it} collapsed={collapsed} onNavigate={onNavigate} />)}

      {sections.map((sec) => collapsed ? (
        <div key={sec.label}>
          <div className="my-2 mx-auto h-px w-8 bg-white/10" />
          {sec.items.map((it) => <NavRow key={it.to} item={it} collapsed onNavigate={onNavigate} />)}
        </div>
      ) : (
        <div key={sec.label} className="mt-2">
          <button
            type="button" onClick={() => toggle(sec.label)} aria-expanded={open.has(sec.label)}
            className={`flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${open.has(sec.label) ? 'bg-white/[0.06] text-white/70' : 'text-white/35 hover:bg-white/8 hover:text-white/60'}`}
          >
            <span className="truncate">{sec.label}</span>
            <ChevronRight size={13} className={`shrink-0 transition-transform ${open.has(sec.label) ? 'rotate-90' : ''}`} />
          </button>
          {open.has(sec.label) && (
            <div className="mt-0.5">
              {sec.items.map((it) => <NavRow key={it.to} item={it} collapsed={false} indent onNavigate={onNavigate} />)}
            </div>
          )}
        </div>
      ))}
    </>
  )
}
