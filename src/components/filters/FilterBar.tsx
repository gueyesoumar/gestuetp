import { useEffect, useRef, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import type { FilterDef, FilterValues, FiltersState } from './useFilters'

interface Props {
  defs: FilterDef[]
  state: FiltersState
  /** Recherche texte libre (facultative), à part du bouton Filtres. */
  search?: { value: string; onChange: (v: string) => void; placeholder?: string }
}

/** Barre de filtre standard : recherche + UN bouton « Filtres » (panneau multi-critères,
 *  brouillon + Appliquer) + puces des filtres actifs. Même UI partout (RFC UX filtres). */
export function FilterBar({ defs, state, search }: Props): JSX.Element {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<FilterValues>(state.values)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent): void => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const openPanel = (): void => { setDraft(state.values); setOpen((o) => !o) }
  const apply = (): void => { state.setAll(draft); setOpen(false) }
  const setDraftVal = (key: string, v: string | boolean | undefined): void => setDraft((d) => ({ ...d, [key]: v }))

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {search && (
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search.value} onChange={(e) => search.onChange(e.target.value)} placeholder={search.placeholder ?? 'Rechercher...'}
              className="w-full pl-9 pr-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700" />
          </div>
        )}
        <div className="relative" ref={wrapRef}>
          <button onClick={openPanel}
            className={`inline-flex items-center gap-2 px-3 py-2 text-[13px] font-semibold rounded-lg border ${state.activeCount > 0 ? 'border-forest-600 text-forest-700 bg-forest-50' : 'border-gray-300 text-gray-600 bg-white hover:border-forest-600'}`}>
            <SlidersHorizontal size={15} /> Filtres
            {state.activeCount > 0 && <span className="font-mono text-[11px] font-bold bg-forest-700 text-white rounded-full min-w-[18px] h-[18px] inline-grid place-items-center px-1">{state.activeCount}</span>}
          </button>
          {open && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-4">
              <div className="space-y-3">
                {defs.map((d) => (
                  <div key={d.key}>
                    {d.type === 'select' ? (
                      <>
                        <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{d.label}</label>
                        <select value={(draft[d.key] as string) ?? ''} onChange={(e) => setDraftVal(d.key, e.target.value)}
                          className="w-full px-2.5 py-2 text-[13px] border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700">
                          <option value="">Tous</option>
                          {d.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </>
                    ) : (
                      <label className="flex items-center gap-2.5 text-[13px] text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={draft[d.key] === true} onChange={(e) => setDraftVal(d.key, e.target.checked)} className="w-4 h-4 accent-[#E07A5F]" />
                        {d.label}
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => setDraft({})} className="text-[12px] font-semibold text-gray-500 hover:text-gray-700">Réinitialiser</button>
                <button onClick={apply} className="px-4 py-2 text-[13px] font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900">Appliquer</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {state.chips.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {state.chips.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold bg-forest-50 border border-forest-100 text-forest-700 rounded-full pl-2.5 pr-1.5 py-0.5">
              {c.label}
              <button onClick={() => state.clear(c.key)} className="text-forest-600 hover:text-forest-900" aria-label="Retirer"><X size={12} /></button>
            </span>
          ))}
          <button onClick={state.reset} className="text-[12px] font-semibold text-[#B34A31] hover:underline ml-1">Tout effacer</button>
        </div>
      )}
    </div>
  )
}
