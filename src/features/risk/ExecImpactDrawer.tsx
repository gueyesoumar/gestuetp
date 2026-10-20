import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { ExecThreat } from './execSynthesis'
import { severityOf, SEVERITY_LABEL, probaOf, durationOf } from './execSynthesis'
import { impactFor } from './impactTemplates'

const SEV_PILL: Record<string, string> = {
  critique: 'bg-red-50 text-red-700 border-red-200',
  serieux: 'bg-amber-50 text-amber-700 border-amber-200',
  modere: 'bg-gray-100 text-gray-600 border-gray-200',
}

/** Panneau « Si ce risque se matérialise » : simulation d'impact en langage décideur. */
export function ExecImpactDrawer({ threat, onClose }: { threat: ExecThreat | null; onClose: () => void }): JSX.Element | null {
  useEffect(() => {
    if (!threat) return
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [threat, onClose])

  if (!threat) return null
  const sev = severityOf(threat.exposure)
  const m = impactFor(threat.sector)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 w-[min(460px,94vw)] bg-[#FAFAF8] border-l border-gray-200 z-50 overflow-y-auto shadow-xl" role="dialog" aria-modal="true">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded border ${SEV_PILL[sev]}`}>{SEVERITY_LABEL[sev]}</span>
            <button onClick={onClose} className="ml-auto w-8 h-8 grid place-items-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700" aria-label="Fermer"><X size={16} /></button>
          </div>
          <h2 className="text-[17px] font-bold text-gray-900 leading-snug">{threat.title}</h2>
          <div className="text-[12px] text-gray-500 mt-1 flex items-center gap-2">{threat.org_name}{threat.is_iic && <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#FBF4E2] text-[#9C7A1F] border border-[#E6D7A8]">Vitale</span>}</div>
        </div>
        <div className="px-5 py-4 pb-8">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#9C7A1F] mb-2">Si ce risque se matérialise</p>
          <p className="text-[15px] leading-relaxed text-gray-900 bg-white border border-gray-200 border-l-[3px] border-l-red-400 rounded-lg px-4 py-3">
            Sur {threat.org_name}, {m.lead}.
          </p>
          <div className="flex gap-2 flex-wrap my-5">
            <Fact label="Probabilité" value={probaOf(threat.likelihood)} />
            <Fact label="Durée estimée" value={durationOf(threat.exposure)} />
            <Fact label="Indice de risque" value={`${threat.exposure} / 100`} />
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#9C7A1F] mb-2">Conséquences concrètes</p>
          <div>
            {m.domains.map((d, i) => (
              <div key={i} className="flex gap-3 py-3 border-t border-gray-100 first:border-t-0">
                <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-wide text-forest-700 bg-forest-50 border border-forest-100 rounded px-2 py-1 h-fit min-w-[92px] text-center">{d.tag}</span>
                <span className="text-[13px] text-gray-700 leading-relaxed">{d.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 bg-[#FBF4E2] border border-[#E6D7A8] rounded-lg px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#9C7A1F] mb-1.5">Ce qui réduirait le risque</p>
            <p className="text-[13px] text-gray-900">{m.mitigation}</p>
          </div>
          <p className="text-[10.5px] text-gray-400 mt-4 italic">Estimation à titre indicatif, fondée sur l&apos;évaluation du risque. Ordres de grandeur, non des prévisions exactes.</p>
        </div>
      </aside>
    </>
  )
}

function Fact({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-[120px]">
      <div className="text-[9.5px] uppercase tracking-wide font-bold text-gray-500">{label}</div>
      <div className="text-[13px] font-bold text-gray-900 mt-0.5">{value}</div>
    </div>
  )
}
