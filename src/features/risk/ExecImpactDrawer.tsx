import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import type { ExecThreat } from './execSynthesis'
import { severityOf, SEVERITY_LABEL, probaOf } from './execSynthesis'
import { RISK_TREATMENTS } from '../../lib/constants'
import { useSupervisedScenarioDetail } from './useSupervisedScenarioDetail'

const SEV_PILL: Record<string, string> = {
  critique: 'bg-red-50 text-red-700 border-red-200',
  serieux: 'bg-amber-50 text-amber-700 border-amber-200',
  modere: 'bg-gray-100 text-gray-600 border-gray-200',
}
const TREATMENT = Object.fromEntries(RISK_TREATMENTS.map((t) => [t.value, t.label]))
const fmtDate = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Non planifiée')

/** Panneau « Si ce risque se matérialise » : fiche FACTUELLE du scénario (données réelles
 *  du registre), en langage dirigeant. Aucune donnée fabriquée. */
export function ExecImpactDrawer({ threat, onClose }: { threat: ExecThreat | null; onClose: () => void }): JSX.Element | null {
  const { detail, loading } = useSupervisedScenarioDetail(threat?.id ?? null)

  useEffect(() => {
    if (!threat) return
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [threat, onClose])

  if (!threat) return null
  const sev = severityOf(threat.exposure)
  const vitale = detail?.org_is_iic ?? threat.is_iic

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
          <div className="text-[12px] text-gray-500 mt-1 flex items-center gap-2">{threat.org_name}{vitale && <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#FBF4E2] text-[#9C7A1F] border border-[#E6D7A8]">Vitale</span>}</div>
        </div>

        <div className="px-5 py-4 pb-8 space-y-5">
          <div className="flex gap-2 flex-wrap">
            <Fact label="Gravité" value={SEVERITY_LABEL[sev]} />
            <Fact label="Probabilité" value={probaOf(threat.likelihood)} />
            <Fact label="Exposition" value={`${threat.exposure} / 100`} />
          </div>

          <Section title="Ce qui est en jeu">
            <p className="text-[14px] leading-relaxed text-gray-900 bg-white border border-gray-200 border-l-[3px] border-l-red-400 rounded-lg px-4 py-3">
              {loading ? 'Chargement...' : (detail?.feared_label ?? 'Non précisé')}
            </p>
            <p className="text-[12.5px] text-gray-500 mt-2">Actif concerné : <span className="font-medium text-gray-700">{loading ? '...' : (detail?.asset_name ?? 'Non précisé')}</span></p>
          </Section>

          <Section title="Prise en charge">
            <div className="flex gap-2 flex-wrap">
              <Fact label="Traitement" value={loading ? '...' : (TREATMENT[detail?.treatment ?? ''] ?? 'Non précisé')} />
              <Fact label="Prochaine revue" value={loading ? '...' : fmtDate(detail?.next_review_at ?? null)} />
            </div>
          </Section>

          <Section title="Mesures en place">
            {loading ? (
              <p className="text-[13px] text-gray-400">Chargement...</p>
            ) : (detail?.measures.length ?? 0) > 0 ? (
              <ul className="space-y-1.5">
                {detail!.measures.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-gray-800">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-forest-500 shrink-0" />{m}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-gray-400">Non précisé : aucune mesure rattachée à ce risque.</p>
            )}
          </Section>

          <p className="text-[10.5px] text-gray-400 italic">Données issues du registre de risque de l&apos;institution.</p>
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

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-bold text-[#9C7A1F] mb-2">{title}</p>
      {children}
    </div>
  )
}
