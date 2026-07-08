import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, BookMarked } from 'lucide-react'
import { useFrameworks } from '../features/frameworks/useFrameworks'
import { useReferentielContent } from './useReferentielContent'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { EmptyState } from '../components/ui/EmptyState'

const RISK_STYLE: Record<string, string> = {
  low: 'bg-green-50 text-green-700',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-orange-50 text-orange-700',
  critical: 'bg-red-50 text-red-700',
}

/** Consultation des référentiels d'audit (Gëstu Regul / M6, lecture seule). */
export function RegulReferentielsPage(): JSX.Element {
  const { frameworks, loading: fwLoading } = useFrameworks()
  const [fwId, setFwId] = useState('')
  const { domains, totalControls, loading } = useReferentielContent(fwId || null)
  const [open, setOpen] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!fwId && frameworks.length > 0) setFwId(frameworks[0].id)
  }, [frameworks, fwId])

  const toggle = (id: string): void => setOpen((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  if (fwLoading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Référentiels</h1>
        <p className="mt-1 text-[13px] text-gray-500">Cadres d&apos;audit appliqués aux missions de contrôle.</p>
      </div>

      {frameworks.length === 0 ? (
        <EmptyState title="Aucun référentiel" description="Aucun cadre d’audit n’est disponible sur cette instance." />
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <select value={fwId} onChange={(e) => setFwId(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg w-80 focus:border-forest-700 focus:ring-1 focus:ring-forest-700">
              {frameworks.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {!loading && <span className="text-[12px] text-gray-500">{domains.length} domaine{domains.length > 1 ? 's' : ''} · {totalControls} contrôle{totalControls > 1 ? 's' : ''}</span>}
          </div>

          {loading ? <LoadingSpinner /> : domains.length === 0 ? (
            <EmptyState title="Référentiel vide" description="Ce cadre n’a pas encore de contrôles chargés." />
          ) : (
            <div className="space-y-2">
              {domains.map((d) => (
                <div key={d.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => toggle(d.id)} className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-forest-50/40 text-left">
                    {open.has(d.id) ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                    <BookMarked size={16} className="text-forest-600" />
                    <span className="font-semibold text-[14px] text-gray-900">{d.code} — {d.name}</span>
                    <span className="ml-auto text-[11px] text-gray-400">{d.controls.length} contrôle{d.controls.length > 1 ? 's' : ''}</span>
                  </button>
                  {open.has(d.id) && (
                    <ul className="border-t border-gray-100 divide-y divide-gray-50">
                      {d.controls.map((c) => (
                        <li key={c.id} className="flex items-start gap-3 px-5 py-2.5">
                          <span className="text-[11px] font-mono text-forest-700 mt-0.5 w-16 flex-shrink-0">{c.code}</span>
                          <span className="flex-1 text-[13px] text-gray-700">{c.name}</span>
                          {c.risk_level && <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${RISK_STYLE[c.risk_level] ?? 'bg-gray-100 text-gray-500'}`}>{c.risk_level}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
