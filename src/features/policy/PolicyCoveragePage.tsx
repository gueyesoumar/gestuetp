import { useState } from 'react'
import { LayoutGrid, Check, Sparkles } from 'lucide-react'
import { usePolicyCoverage, type RequiredPolicy } from './usePolicyCoverage'
import { usePolicyRegister } from './usePolicyRegister'
import { PolicyCreateModal } from './PolicyCreateModal'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'

export function PolicyCoveragePage(): JSX.Element {
  const cov = usePolicyCoverage()
  const { createPolicy } = usePolicyRegister()
  const [gap, setGap] = useState<RequiredPolicy | null>(null)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><LayoutGrid size={20} className="text-[#6D5AE6]" /> Couverture des politiques</h1>
        <p className="mt-1 text-[13px] text-gray-500">Le jeu de politiques requises par référentiel, confronté à votre registre — et les lacunes à combler.</p>
      </div>

      {cov.frameworks.length === 0 ? (
        <EmptyState title="Aucun référentiel" description="Le jeu requis est dérivé des référentiels de vos missions." />
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {cov.frameworks.map((f) => (
              <button key={f.id} onClick={() => cov.select(f.id)}
                className={`text-[13px] font-semibold rounded-lg px-3 py-2 border ${cov.selected === f.id ? 'bg-[#6D5AE6] text-white border-transparent' : 'bg-white text-gray-600 border-gray-300 hover:border-[#6D5AE6]'}`}>
                {f.name}
              </button>
            ))}
          </div>

          {cov.loading ? <LoadingSpinner /> : (
            <>
              <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-2xl font-bold text-gray-900 min-w-[64px]">{cov.coverage}%</div>
                <div className="flex-1">
                  <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${cov.coverage}%`, background: 'linear-gradient(90deg,#6D5AE6,#B8891F)' }} />
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono mt-1.5">{cov.required.filter((r) => r.covered).length}/{cov.required.length} politiques requises couvertes</div>
                </div>
              </div>

              {cov.required.length === 0 ? (
                <p className="text-[13px] text-gray-400 py-6 text-center">Aucune politique requise déclarée pour ce référentiel (preuves attendues de type « politique »).</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cov.required.map((r) => (
                    <div key={r.evidenceId} className={`rounded-xl border p-3 flex items-start gap-3 ${r.covered ? 'border-gray-200 bg-white' : 'border-dashed border-red-200 bg-red-50/40'}`}>
                      <span className={`w-6 h-6 rounded-lg grid place-items-center text-[13px] font-bold shrink-0 ${r.covered ? 'bg-forest-50 text-forest-700' : 'bg-red-50 text-red-600'}`}>{r.covered ? <Check size={13} /> : '!'}</span>
                      <div className="flex-1">
                        <div className="text-[13px] font-semibold text-gray-900">{r.name}</div>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">{r.controlCode}</div>
                      </div>
                      {!r.covered && (
                        <button onClick={() => setGap(r)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6D5AE6] hover:brightness-110 shrink-0">
                          <Sparkles size={12} /> Rédiger
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {gap && (
        <PolicyCreateModal
          initialTitle={gap.name}
          linkControlId={gap.controlId}
          onCreate={createPolicy}
          onClose={() => { setGap(null); cov.refresh() }}
        />
      )}
    </div>
  )
}
