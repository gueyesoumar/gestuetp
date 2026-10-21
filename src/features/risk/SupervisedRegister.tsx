import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useSupervisedRegister, useSupervisedPortfolio, type SupervisedRisk } from './useSupervisedPortfolio'
import { useSupervisorDirectives } from './useSupervisorDirectives'
import { useVocab } from '../edition/useVocab'
import { useToast } from '../../hooks/useToast'
import { ExpoBadge, DimChip, LifecycleChip, IicBadge, SourceBadge } from './riskLabels'
import { RequestActionPanel } from './RequestActionPanel'
import { CreateSupervisedScenarioModal } from './CreateSupervisedScenarioModal'
import { RISK_SOURCE_LABELS } from '../../lib/constants'
import { ExpositionHelp } from './ExpositionHelp'
import { FilterBar } from '../../components/filters/FilterBar'
import { useFilters, type FilterDef } from '../../components/filters/useFilters'
import { Pagination, pageSlice } from '../../components/ui/Pagination'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { AuditedScenarioBowtie, type AuditedScenario } from '../missions/AuditedScenarioBowtie'
import { riskExposure, SCORE_DIMENSION_LABELS, type ScoreDimensionKey } from '../../lib/constants'
import type { RiskCatalogEntry } from '../../types/database.types'

const PAGE = 10
const toAudited = (r: SupervisedRisk): AuditedScenario => ({
  id: r.id, title: r.title, dimension: r.dimension,
  inherent_likelihood: r.inherent_likelihood, inherent_impact: r.inherent_impact,
  threat_ref: r.threat_ref, feared_event_ref: r.feared_event_ref,
  vulnerability: r.vulnerability, asset_name: r.asset_name,
})
/** Registre consolidé des assujettis supervisés : filtre standard + pagination + demande d'action. */
export function SupervisedRegister({ catalog }: { catalog: RiskCatalogEntry[] }): JSX.Element {
  const { rows, loading, error, reload } = useSupervisedRegister()
  const portfolio = useSupervisedPortfolio()
  const dir = useSupervisorDirectives()
  const vocab = useVocab()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<SupervisedRisk | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const orgOptions = useMemo(() => portfolio.orgs.map((o) => ({ id: o.organization_id, name: o.org_name })).sort((a, b) => a.name.localeCompare(b.name)), [portfolio.orgs])
  const [requestFor, setRequestFor] = useState<SupervisedRisk | null>(null)

  const defs = useMemo<FilterDef[]>(() => {
    const secteurs = [...new Set(rows.map((r) => r.org_sector).filter((s): s is string => !!s))].sort()
    const dims = [...new Set(rows.map((r) => r.dimension).filter((d): d is string => !!d))]
    return [
      { key: 'secteur', label: 'Secteur', type: 'select', options: secteurs.map((s) => ({ value: s, label: s })) },
      { key: 'type', label: 'Type', type: 'select', options: [{ value: 'iic', label: 'IIC' }, { value: 'std', label: 'Standard' }] },
      { key: 'dim', label: 'Dimension', type: 'select', options: dims.map((d) => ({ value: d, label: SCORE_DIMENSION_LABELS[d as ScoreDimensionKey] ?? d })) },
      { key: 'source', label: 'Origine', type: 'select', options: Object.entries(RISK_SOURCE_LABELS).map(([value, label]) => ({ value, label })) },
      { key: 'hors', label: 'Hors seuil (≥ 60)', type: 'toggle' },
    ]
  }, [rows])
  const f = useFilters(defs)

  const filtered = useMemo(() => rows.filter((r) => {
    const e = riskExposure(r.inherent_likelihood, r.inherent_impact)
    const n = q.trim().toLowerCase()
    if (n && !(r.org_name.toLowerCase().includes(n) || r.title.toLowerCase().includes(n))) return false
    if (f.values.secteur && r.org_sector !== f.values.secteur) return false
    if (f.values.type === 'iic' && !r.org_is_iic) return false
    if (f.values.type === 'std' && r.org_is_iic) return false
    if (f.values.dim && r.dimension !== f.values.dim) return false
    if (f.values.source && r.source !== f.values.source) return false
    if (f.values.hors && e < 60) return false
    return true
  }), [rows, q, f.values])

  const submit = async (d: string): Promise<void> => {
    if (!requestFor || !d.trim()) return
    const res = await dir.request(requestFor.id, d.trim())
    if (res.ok) { toast.success(`Demande envoyée à l'${vocab.entitySingular}`); setRequestFor(null) }
    else toast.error('Demande impossible', { description: res.error })
  }

  if (error) return <ErrorAlert message={error} />
  if (loading) return <LoadingSpinner />

  const pageRows = pageSlice(filtered, page, PAGE)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button onClick={() => setCreateOpen(true)} disabled={orgOptions.length === 0} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50"><Plus size={16} /> Créer un risque</button>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucun risque" description={`Vous ne supervisez pas (encore) de ${vocab.entitySingular} ayant des risques. Utilisez « Créer un risque » pour en ajouter un au registre d'un assujetti.`} />
      ) : (
      <>
      <FilterBar defs={defs} state={f} search={{ value: q, onChange: (v) => { setQ(v); setPage(1) }, placeholder: `Rechercher un ${vocab.entitySingular}, un scénario...` }} />

      {requestFor && <RequestActionPanel label={`${requestFor.org_name} · ${requestFor.title}`} dimension={requestFor.dimension} onSubmit={submit} onCancel={() => setRequestFor(null)} />}

      {filtered.length === 0 ? (
        <EmptyState title="Aucun résultat" description="Aucun risque ne correspond à ces filtres." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">{vocab.entitiesTitle}</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Secteur</th>
                <th className="text-left px-4 py-3 font-semibold">Scénario</th>
                <th className="text-left px-4 py-3 font-semibold">Dimension</th>
                <th className="text-left px-4 py-3 font-semibold"><span className="inline-flex items-center gap-1">Exposition <ExpositionHelp /></span></th>
                <th className="text-left px-4 py-3 font-semibold">Cycle de vie</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageRows.map((r) => {
                const exp = riskExposure(r.inherent_likelihood, r.inherent_impact)
                return (
                  <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDetail(r)}>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.org_name}</td>
                    <td className="px-4 py-3"><IicBadge iic={r.org_is_iic} /></td>
                    <td className="px-4 py-3 text-gray-500">{r.org_sector ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-700"><span className="inline-flex items-center gap-2"><span className="font-medium text-gray-900 hover:text-[#6D5AE6]">{r.title}</span><SourceBadge source={r.source} /></span></td>
                    <td className="px-4 py-3"><DimChip d={r.dimension} /></td>
                    <td className="px-4 py-3"><ExpoBadge value={exp} /></td>
                    <td className="px-4 py-3"><LifecycleChip v={r.lifecycle_status} /></td>
                    <td className="px-4 py-3 text-right"><button onClick={(e) => { e.stopPropagation(); setRequestFor(r) }} className="text-[12px] font-semibold text-forest-700 hover:underline whitespace-nowrap">Demander une action</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Pagination total={filtered.length} page={page} pageSize={PAGE} onPage={setPage} />
        </div>
      )}
      </>
      )}

      {detail && <AuditedScenarioBowtie scenario={toAudited(detail)} catalog={catalog} onClose={() => setDetail(null)} />}
      {createOpen && <CreateSupervisedScenarioModal orgs={orgOptions} onClose={() => setCreateOpen(false)} onCreated={reload} />}
    </div>
  )
}
