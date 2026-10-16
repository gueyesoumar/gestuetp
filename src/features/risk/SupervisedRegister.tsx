import { useState } from 'react'
import { useSupervisedRegister, type SupervisedRisk } from './useSupervisedPortfolio'
import { useSupervisorDirectives } from './useSupervisorDirectives'
import { useVocab } from '../edition/useVocab'
import { useToast } from '../../hooks/useToast'
import { treatmentLabel, expColor, DimChip, LifecycleChip } from './riskLabels'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { AuditedScenarioBowtie, type AuditedScenario } from '../missions/AuditedScenarioBowtie'
import { riskExposure } from '../../lib/constants'
import type { RiskCatalogEntry } from '../../types/database.types'

const toAudited = (r: SupervisedRisk): AuditedScenario => ({
  id: r.id, title: r.title, dimension: r.dimension,
  inherent_likelihood: r.inherent_likelihood, inherent_impact: r.inherent_impact,
  threat_ref: r.threat_ref, feared_event_ref: r.feared_event_ref,
  vulnerability: r.vulnerability, asset_name: r.asset_name,
})

/** Registre consolidé des risques de TOUS les assujettis supervisés + demande d'action (RFC 0017 Lot H). */
export function SupervisedRegister({ catalog }: { catalog: RiskCatalogEntry[] }): JSX.Element {
  const { rows, loading, error } = useSupervisedRegister()
  const dir = useSupervisorDirectives()
  const vocab = useVocab()
  const toast = useToast()
  const [detail, setDetail] = useState<SupervisedRisk | null>(null)
  const [requestFor, setRequestFor] = useState<SupervisedRisk | null>(null)
  const [desc, setDesc] = useState('')

  const submit = async (): Promise<void> => {
    if (!requestFor || !desc.trim()) return
    const res = await dir.request(requestFor.id, desc.trim())
    if (res.ok) { toast.success(`Demande envoyée à l'${vocab.entitySingular}`); setRequestFor(null); setDesc('') }
    else toast.error('Demande impossible', { description: res.error })
  }

  if (error) return <ErrorAlert message={error} />
  if (loading) return <LoadingSpinner />
  if (rows.length === 0) return <EmptyState title="Aucun risque" description={`Vous ne supervisez pas (encore) de ${vocab.entitySingular} ayant des risques, ou aucune mission active ne vous y donne accès.`} />

  return (
    <div className="space-y-4">
      {requestFor && (
        <div className="rounded-xl border border-forest-200 bg-forest-50 p-4 space-y-2">
          <div className="text-[13px] font-semibold text-gray-900">Demander une action · <span className="font-normal">{requestFor.org_name} · {requestFor.title}</span></div>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Action demandée (ex. déployer la MFA sur les comptes admin)" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-[13px]" />
          <div className="flex gap-2">
            <button onClick={() => void submit()} disabled={!desc.trim()} className="px-3 py-1.5 text-[12px] font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">Envoyer la demande</button>
            <button onClick={() => { setRequestFor(null); setDesc('') }} className="px-3 py-1.5 text-[12px] text-gray-500">Annuler</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">{vocab.entitiesTitle}</th>
              <th className="text-left px-4 py-3 font-semibold">Scénario</th>
              <th className="text-left px-4 py-3 font-semibold">Dimension</th>
              <th className="text-left px-4 py-3 font-semibold">Exposition</th>
              <th className="text-left px-4 py-3 font-semibold">Cycle de vie</th>
              <th className="text-left px-4 py-3 font-semibold">Traitement</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const exp = riskExposure(r.inherent_likelihood, r.inherent_impact)
              return (
                <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDetail(r)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.org_name}</td>
                  <td className="px-4 py-3 text-gray-700"><span className="font-medium text-gray-900 hover:text-[#6D5AE6]">{r.title}</span>{r.asset_name && <span className="text-gray-400"> · {r.asset_name}</span>}</td>
                  <td className="px-4 py-3"><DimChip d={r.dimension} /></td>
                  <td className="px-4 py-3 font-semibold" style={{ color: expColor(exp) }}>{exp}</td>
                  <td className="px-4 py-3"><LifecycleChip v={r.lifecycle_status} /></td>
                  <td className="px-4 py-3 text-gray-600">{treatmentLabel(r.treatment)}</td>
                  <td className="px-4 py-3 text-right"><button onClick={(e) => { e.stopPropagation(); setRequestFor(r); setDesc('') }} className="text-[12px] font-semibold text-forest-700 hover:underline whitespace-nowrap">Demander une action</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {detail && <AuditedScenarioBowtie scenario={toAudited(detail)} catalog={catalog} onClose={() => setDetail(null)} />}
    </div>
  )
}
