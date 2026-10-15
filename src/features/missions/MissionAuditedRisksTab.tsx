import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { SCORE_DIMENSION_LABELS, SCORE_DIMENSION_COLORS, RISK_TREATMENTS, riskExposure, type ScoreDimensionKey } from '../../lib/constants'
import { AuditedScenarioBowtie, type AuditedScenario } from './AuditedScenarioBowtie'
import { useSupervisorDirectives } from '../risk/useSupervisorDirectives'
import { useVocab } from '../edition/useVocab'
import { useToast } from '../../hooks/useToast'
import type { RiskCatalogEntry } from '../../types/database.types'

type AuditedRisk = AuditedScenario & { treatment: string }

const treatmentLabel = (v: string): string => RISK_TREATMENTS.find((t) => t.value === v)?.label ?? v
const expColor = (v: number): string => v >= 60 ? '#C0392B' : v >= 30 ? '#B8860B' : '#27AE60'

/** Onglet lecture seule : registre de risque de l'organisation AUDITÉE, pour l'auditeur
 *  de la mission (cross-tenant via get_audited_org_risks, need-to-know par mission). */
export function MissionAuditedRisksTab({ missionId }: { missionId: string }): JSX.Element {
  const [rows, setRows] = useState<AuditedRisk[]>([])
  const [catalog, setCatalog] = useState<RiskCatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AuditedRisk | null>(null)
  const dir = useSupervisorDirectives()
  const toast = useToast()
  const vocab = useVocab()
  const [requestFor, setRequestFor] = useState<AuditedRisk | null>(null)
  const [desc, setDesc] = useState('')

  const submitRequest = async (): Promise<void> => {
    if (!requestFor || !desc.trim()) return
    const res = await dir.request(requestFor.id, desc.trim())
    if (res.ok) { toast.success(`Demande envoyée à l'${vocab.entitySingular}`); setRequestFor(null); setDesc('') }
    else toast.error('Demande impossible', { description: res.error })
  }

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const [risksRes, catRes] = await Promise.all([
        supabase.rpc('get_audited_org_risks', { p_mission_id: missionId }).abortSignal(ac.signal),
        supabase.from('risk_catalog').select('*').abortSignal(ac.signal),
      ])
      if (ac.signal.aborted) return
      if (risksRes.error) console.error('[audited risks]', risksRes.error.message)
      setRows((risksRes.data ?? []) as AuditedRisk[])
      setCatalog((catRes.data ?? []) as RiskCatalogEntry[])
      setLoading(false)
    })()
    return () => ac.abort()
  }, [missionId])

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Registre de risque de l&apos;{vocab.entitySingular}</h2>
        <p className="text-[13px] text-gray-500 mt-1">Registre de risque de l&apos;{vocab.entitySingular} (lecture) ; vous pouvez <b>demander des actions de traitement</b> et vérifier leur réalisation.</p>
      </div>

      {requestFor && (
        <div className="rounded-xl border border-forest-200 bg-forest-50 p-4 space-y-2">
          <div className="text-[13px] font-semibold text-gray-900">Demander une action de traitement · <span className="font-normal">{requestFor.title}</span></div>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder={`Action demandée à l'${vocab.entitySingular} (ex. déployer la MFA sur les comptes admin)`} className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-[13px]" />
          <div className="flex gap-2">
            <button onClick={() => void submitRequest()} disabled={!desc.trim()} className="px-3 py-1.5 text-[12px] font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">Envoyer la demande</button>
            <button onClick={() => { setRequestFor(null); setDesc('') }} className="px-3 py-1.5 text-[12px] text-gray-500">Annuler</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title="Aucun risque" description="L'organisation auditée n'a pas (encore) de scénario dans son registre, ou n'utilise pas Gëstu Risk." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Scénario</th>
                <th className="text-left px-4 py-3 font-semibold">Dimension</th>
                <th className="text-left px-4 py-3 font-semibold">Cotation</th>
                <th className="text-left px-4 py-3 font-semibold">Exposition</th>
                <th className="text-left px-4 py-3 font-semibold">Traitement</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => {
                const exp = riskExposure(r.inherent_likelihood, r.inherent_impact)
                const dimColor = r.dimension ? SCORE_DIMENSION_COLORS[r.dimension as ScoreDimensionKey] : '#94A3B8'
                return (
                  <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(r)}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 hover:text-[#6D5AE6]">{r.title}</span>
                      {r.asset_name && <span className="text-gray-400"> · {r.asset_name}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.dimension && <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: `${dimColor}22`, color: dimColor }}>{SCORE_DIMENSION_LABELS[r.dimension as ScoreDimensionKey]}</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500">V{r.inherent_likelihood}·I{r.inherent_impact}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: expColor(exp) }}>{exp}</td>
                    <td className="px-4 py-3 text-gray-600">{treatmentLabel(r.treatment)}</td>
                    <td className="px-4 py-3 text-right"><button onClick={(e) => { e.stopPropagation(); setRequestFor(r) }} className="text-[12px] font-semibold text-forest-700 hover:underline whitespace-nowrap">Demander une action</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {dir.rows.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Mes demandes de traitement</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">{vocab.entitiesTitle}</th>
                  <th className="text-left px-3 py-2 font-semibold">Action demandée</th>
                  <th className="text-left px-3 py-2 font-semibold">Échéance</th>
                  <th className="text-left px-3 py-2 font-semibold">Statut {vocab.entitySingular}</th>
                  <th className="text-left px-3 py-2 font-semibold">Vérification</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dir.rows.map((d) => {
                  const verifLabel = d.verification_status === 'verified' ? 'Vérifié' : d.verification_status === 'rejected' ? 'Rejeté' : 'À vérifier'
                  const canVerify = d.status === 'done' && d.verification_status === 'pending'
                  return (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700">{d.org_name}</td>
                      <td className="px-3 py-2"><span className="text-gray-900">{d.description}</span>{d.scenario_title && <div className="text-[11px] text-gray-400">{d.scenario_title}</div>}</td>
                      <td className="px-3 py-2 text-gray-500">{d.due_date ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{d.status === 'done' ? 'Fait' : d.status === 'in_progress' ? 'En cours' : d.status === 'cancelled' ? 'Annulé' : 'À faire'}</td>
                      <td className="px-3 py-2"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${d.verification_status === 'verified' ? 'bg-green-50 text-green-700' : d.verification_status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{verifLabel}</span></td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {canVerify && (
                          <>
                            <button onClick={() => void dir.verify(d.id, 'verified')} className="text-[12px] font-semibold text-green-700 hover:underline">Vérifier</button>
                            <button onClick={() => void dir.verify(d.id, 'rejected')} className="ml-3 text-[12px] font-semibold text-red-600 hover:underline">Rejeter</button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && <AuditedScenarioBowtie scenario={selected} catalog={catalog} onClose={() => setSelected(null)} />}
    </div>
  )
}
