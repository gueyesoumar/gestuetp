import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronsUpDown } from 'lucide-react'
import type { SubsidiaryRow } from './useSubsidiaries'
import { ENTITY_TYPE_LABELS } from '../../lib/constants'
import { SubsidiaryCoverage } from './SubsidiaryCoverage'
import { SubsidiaryCardMenu } from './SubsidiaryCardMenu'

interface Props {
  rows: SubsidiaryRow[]
  isRegul: boolean
  routeBase: string
  onEdit?: (s: SubsidiaryRow) => void
  onDeactivate?: (s: SubsidiaryRow) => void
}

type SortKey = 'name' | 'cov' | 'plans' | 'rev'
const initials = (name: string): string => name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
const fmt = (d: string | null): string => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '-')
const revDate = (s: SubsidiaryRow): string | null => s.reviewCycle?.date ?? s.nextReviewDate

export function SubsidiaryTable({ rows, isRegul, routeBase, onEdit, onDeactivate }: Props): JSX.Element {
  const navigate = useNavigate()
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 })
  const showActions = !!onEdit || !!onDeactivate

  const sorted = useMemo(() => {
    const val = (s: SubsidiaryRow): string | number => {
      if (sort.key === 'name') return s.name.toLowerCase()
      if (sort.key === 'cov') return s.conformityScore ?? -1
      if (sort.key === 'plans') return s.overdueCount
      return revDate(s) ?? '9999'
    }
    return [...rows].sort((a, b) => { const x = val(a), y = val(b); return x < y ? -sort.dir : x > y ? sort.dir : 0 })
  }, [rows, sort])

  const th = (key: SortKey, label: string): JSX.Element => (
    <th className="cursor-pointer whitespace-nowrap px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500 hover:text-gray-800" onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }))}>
      <span className="inline-flex items-center gap-1">{label}<ChevronsUpDown size={12} className={sort.key === key ? 'text-forest-600' : 'text-gray-300'} /></span>
    </th>
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[820px] border-collapse">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60">
            {th('name', 'Assujetti')}
            <th className="px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">Nature</th>
            <th className="px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">Criticité</th>
            {th('cov', 'Couverture')}
            <th className="px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">Référentiel</th>
            {th('plans', 'Plans')}
            {isRegul && th('rev', 'Prochaine revue')}
            <th className="px-3.5 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s.id} onClick={() => navigate(`${routeBase}/${s.id}`)} className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50/70">
              <td className="px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-forest-50 text-[10px] font-extrabold text-forest-700">{initials(s.name)}</span>
                  <div className="min-w-0"><p className="truncate text-[13.5px] font-semibold text-gray-900">{s.name}</p><p className="truncate text-[11.5px] text-gray-500">{s.sector ?? 'Secteur non renseigné'}</p></div>
                </div>
              </td>
              <td className="px-3.5 py-2.5">{s.entityType && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-gray-600">{ENTITY_TYPE_LABELS[s.entityType]}</span>}</td>
              <td className="px-3.5 py-2.5">{isRegul && s.regulatoryProfile?.criticality === 'eleve' ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10.5px] font-bold text-red-700">IIC</span> : <span className="text-[12px] text-gray-400">Standard</span>}</td>
              <td className="px-3.5 py-2.5"><SubsidiaryCoverage score={s.conformityScore} activeMissions={s.activeMissions} /></td>
              <td className="px-3.5 py-2.5 text-[12.5px] text-gray-600">{s.frameworkLabels.length > 0 ? s.frameworkLabels.join(' · ') : <span className="text-gray-400">Aucun</span>}</td>
              <td className={`px-3.5 py-2.5 text-[13px] font-bold ${s.overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{s.overdueCount}</td>
              {isRegul && <td className="px-3.5 py-2.5 text-[12.5px] text-gray-600">{fmt(revDate(s))}</td>}
              <td className="px-3.5 py-2.5 text-right">{showActions && <SubsidiaryCardMenu subsidiary={s} onEdit={onEdit} onDeactivate={onDeactivate} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
