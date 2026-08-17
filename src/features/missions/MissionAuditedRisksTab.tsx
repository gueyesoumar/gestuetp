import { useEffect, useState, Fragment } from 'react'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { SCORE_DIMENSION_LABELS, SCORE_DIMENSION_COLORS, RISK_TREATMENTS, riskExposure, type ScoreDimensionKey } from '../../lib/constants'
import type { RiskCatalogEntry } from '../../types/database.types'

interface AuditedRisk {
  id: string; title: string; dimension: string | null
  inherent_likelihood: number; inherent_impact: number
  treatment: string; threat_ref: string | null; feared_event_ref: string | null
  vulnerability: string | null; asset_name: string | null
}

const treatmentLabel = (v: string): string => RISK_TREATMENTS.find((t) => t.value === v)?.label ?? v
const expColor = (v: number): string => v >= 60 ? '#C0392B' : v >= 30 ? '#B8860B' : '#27AE60'

/** Onglet lecture seule : registre de risque de l'organisation AUDITÉE, pour l'auditeur
 *  de la mission (cross-tenant via get_audited_org_risks, need-to-know par mission). */
export function MissionAuditedRisksTab({ missionId }: { missionId: string }): JSX.Element {
  const [rows, setRows] = useState<AuditedRisk[]>([])
  const [catalog, setCatalog] = useState<RiskCatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

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

  const label = (id: string | null): string => id ? (catalog.find((c) => c.id === id)?.label ?? '—') : '—'

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Registre de risque de l&apos;assujetti</h2>
        <p className="text-[13px] text-gray-500 mt-1">Les risques identifiés par l&apos;organisation auditée dans Gëstu Risk — <b>lecture seule</b>, contexte de votre mission.</p>
      </div>

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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => {
                const exp = riskExposure(r.inherent_likelihood, r.inherent_impact)
                const dimColor = r.dimension ? SCORE_DIMENSION_COLORS[r.dimension as ScoreDimensionKey] : '#94A3B8'
                const open = expanded === r.id
                return (
                  <Fragment key={r.id}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(open ? null : r.id)}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{r.title}</span>
                        {r.asset_name && <span className="text-gray-400"> · {r.asset_name}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.dimension && <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: `${dimColor}22`, color: dimColor }}>{SCORE_DIMENSION_LABELS[r.dimension as ScoreDimensionKey]}</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-500">V{r.inherent_likelihood}·I{r.inherent_impact}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: expColor(exp) }}>{exp}</td>
                      <td className="px-4 py-3 text-gray-600">{treatmentLabel(r.treatment)}</td>
                    </tr>
                    {open && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={5} className="px-4 py-3 text-[12px] text-gray-600">
                          <div className="grid gap-1 sm:grid-cols-3">
                            <div><span className="font-mono text-[10px] uppercase text-gray-400">Menace</span><br />{label(r.threat_ref)}</div>
                            <div><span className="font-mono text-[10px] uppercase text-gray-400">Événement redouté</span><br />{label(r.feared_event_ref)}</div>
                            <div><span className="font-mono text-[10px] uppercase text-gray-400">Vulnérabilité</span><br />{r.vulnerability || '—'}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
