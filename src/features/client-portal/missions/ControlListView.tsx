import { useState, useMemo } from 'react'
import { Search, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react'
import type { ControlWithAssessment, DomainSummary } from './useMissionControls'
import type { FindingClassification } from '../../../types/database.types'

type FilterKey = 'all' | 'conforme' | 'observation' | 'minor_nc' | 'major_nc' | 'strength' | 'my_observations'

interface ControlListViewProps {
  controls: ControlWithAssessment[]
  domainSummaries: DomainSummary[]
  conformesCount: number
  observationsCount: number
  minorNcCount: number
  majorNcCount: number
  strengthsCount: number
  myObservationsCount: number
  onControlClick: (control: ControlWithAssessment) => void
}

const FILTER_META: Record<FilterKey, { label: string; dot: string }> = {
  all:             { label: 'Tous',         dot: '#9CA3AF' },
  conforme:        { label: 'Conformes',    dot: '#27AE60' },
  observation:     { label: 'Observations', dot: '#D4A843' },
  minor_nc:        { label: 'NC mineures',  dot: '#F59E0B' },
  major_nc:        { label: 'NC majeures',  dot: '#C0392B' },
  strength:        { label: 'Points forts', dot: '#D4A843' },
  my_observations: { label: 'Mes observations', dot: '#2D6A4F' },
}

const BADGE_META: Record<FindingClassification | 'conforme', { label: string; className: string }> = {
  conforme:    { label: 'Conforme',    className: 'bg-green-50 text-green-700' },
  observation: { label: 'Observation', className: 'bg-gold-50 text-gold-600' },
  minor_nc:    { label: 'NC mineure',  className: 'bg-amber-50 text-amber-700' },
  major_nc:    { label: 'NC majeure',  className: 'bg-red-50 text-red-600' },
  strength:    { label: 'Point fort',  className: 'bg-gold-100 text-gold-600 border border-gold-500' },
}

function getClassifKey(c: ControlWithAssessment): FindingClassification | 'conforme' {
  return c.classification ?? 'conforme'
}

function getDot(key: FindingClassification | 'conforme'): string {
  if (key === 'strength') return '#D4A843'
  if (key === 'major_nc') return '#C0392B'
  if (key === 'minor_nc') return '#F59E0B'
  if (key === 'observation') return '#D4A843'
  return '#27AE60'
}

export function ControlListView({
  controls, domainSummaries, conformesCount, observationsCount,
  minorNcCount, majorNcCount, strengthsCount, myObservationsCount,
  onControlClick,
}: ControlListViewProps): JSX.Element {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(
    new Set(domainSummaries.map((d) => d.domainId))
  )

  const filtered = useMemo(() => {
    let list = controls.filter((c) => c.assessmentId !== null) // only evaluated controls

    if (filter === 'conforme') list = list.filter((c) => !c.classification)
    else if (filter === 'observation') list = list.filter((c) => c.classification === 'observation')
    else if (filter === 'minor_nc') list = list.filter((c) => c.classification === 'minor_nc')
    else if (filter === 'major_nc') list = list.filter((c) => c.classification === 'major_nc')
    else if (filter === 'strength') list = list.filter((c) => c.classification === 'strength')
    else if (filter === 'my_observations') list = list.filter((c) => c.myObservationId !== null)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((c) =>
        c.controlCode.toLowerCase().includes(q) ||
        c.controlName.toLowerCase().includes(q) ||
        c.findings.some((f) => f.description.toLowerCase().includes(q))
      )
    }

    return list
  }, [controls, filter, search])

  // Group filtered controls by domain
  const grouped = useMemo(() => {
    const map = new Map<string, { domain: DomainSummary; items: ControlWithAssessment[] }>()
    for (const c of filtered) {
      const domain = domainSummaries.find((d) => d.domainId === c.domainId)
      if (!domain) continue
      const entry = map.get(c.domainId) ?? { domain, items: [] }
      entry.items.push(c)
      map.set(c.domainId, entry)
    }
    return [...map.values()].sort((a, b) => a.domain.sortOrder - b.domain.sortOrder)
  }, [filtered, domainSummaries])

  const toggleDomain = (id: string): void => {
    setExpandedDomains((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filters: { key: FilterKey; count: number }[] = [
    { key: 'all', count: controls.filter((c) => c.assessmentId).length },
    { key: 'conforme', count: conformesCount },
    { key: 'observation', count: observationsCount },
    { key: 'minor_nc', count: minorNcCount },
    { key: 'major_nc', count: majorNcCount },
    { key: 'strength', count: strengthsCount },
    { key: 'my_observations', count: myObservationsCount },
  ]

  return (
    <div>
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 flex gap-2 flex-wrap items-center">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mr-1">Filtrer :</span>
        {filters.map(({ key, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
              filter === key
                ? 'bg-forest-700 text-white border border-forest-700'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-forest-300'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: FILTER_META[key].dot }}
            />
            {FILTER_META[key].label} ({count})
          </button>
        ))}

        <div className="ml-auto relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-[11px] outline-none focus:border-forest-500 w-48"
          />
        </div>
      </div>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-400">Aucun contr{'ô'}le correspondant.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {grouped.map(({ domain, items }) => {
            const isOpen = expandedDomains.has(domain.domainId)
            return (
              <div key={domain.domainId}>
                <button
                  onClick={() => toggleDomain(domain.domainId)}
                  className="w-full px-4 py-2.5 bg-forest-50 hover:bg-forest-100 border-b border-gray-200 flex items-center gap-2.5 transition-colors"
                >
                  {isOpen ? <ChevronDown size={14} className="text-forest-700" /> : <ChevronRight size={14} className="text-forest-700" />}
                  <span className="font-mono text-[11px] font-semibold text-forest-700">{domain.code}</span>
                  <span className="text-[13px] font-semibold text-gray-900 flex-1 text-left">{domain.name}</span>
                  <span className="text-[11px] text-gray-400">
                    {items.length} contr{'ô'}le{items.length > 1 ? 's' : ''} {'·'} {domain.score}% conforme
                  </span>
                </button>

                {isOpen && items.map((c) => {
                  const classifKey = getClassifKey(c)
                  const badge = BADGE_META[classifKey]
                  const dot = getDot(classifKey)
                  const hasObs = c.observationCount > 0

                  return (
                    <button
                      key={c.controlId}
                      onClick={() => onControlClick(c)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 hover:bg-forest-50/30 transition-colors text-left ${
                        c.myObservationId ? 'bg-gold-50/50' : ''
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
                      <span className="font-mono text-[10px] font-semibold text-forest-700 bg-forest-50 px-1.5 py-0.5 rounded shrink-0 min-w-[68px] text-center">
                        {c.controlCode}
                      </span>
                      <span className="text-[12px] text-gray-700 flex-1 truncate">{c.controlName}</span>
                      {hasObs && (
                        <span
                          className="text-gold-600 shrink-0"
                          title={c.myObservationId ? 'Vous avez posté une observation' : `${c.observationCount} observation(s)`}
                        >
                          <MessageSquare size={12} />
                        </span>
                      )}
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${badge.className}`}>
                        {badge.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[11px] text-gray-400 text-center mt-4">
        Cliquez sur un contr{'ô'}le pour voir le d{'é'}tail et ajouter une observation si besoin.
      </p>
    </div>
  )
}
