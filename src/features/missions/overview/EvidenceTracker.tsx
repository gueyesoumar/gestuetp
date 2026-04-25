import { useState, useEffect, useCallback, useMemo } from 'react'
import { Paperclip, Check, Circle, ChevronDown, ChevronRight, Send, Search, Star } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { Badge } from '../../../components/ui/Badge'
import { useMissionEvidenceRequests } from '../useMissionEvidenceRequests'
import { useEvidenceCatalog } from '../useEvidenceCatalog'
import { useMissionEvidenceOverrides } from '../useMissionEvidenceOverrides'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { Document } from '../../../types/database.types'

interface EvidenceTrackerProps {
  missionId: string
  domains: DomainWithControls[]
  documents: Document[]
}

type FilterKey = 'requested' | 'all' | 'received' | 'pending'

interface CatalogRow {
  /** All evidence_catalog IDs that share this (domain, name) — for bulk operations */
  evidenceIds: string[]
  name: string
  description: string | null
  isRequired: boolean
  /** All control codes referencing this evidence within the domain */
  controlCodes: string[]
  domainCode: string
  domainName: string
  requested: boolean
  received: boolean
  fileName: string | null
}

export function EvidenceTracker({ missionId, domains, documents }: EvidenceTrackerProps): JSX.Element {
  const { evidenceByControl, loading: catLoading } = useEvidenceCatalog(domains)
  const { requests, requestedIds, requestEvidence, requesting, refetch: refetchRequests } = useMissionEvidenceRequests(missionId)
  const { isEssential, toggleOverride, saving: savingOverride } = useMissionEvidenceOverrides(missionId)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<FilterKey>('requested')
  const [search, setSearch] = useState('')
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set())

  // Build uploaded evidence names from documents
  const uploadedNames = useMemo(() => {
    const names = new Set<string>()
    for (const doc of documents) {
      const match = doc.description?.match(/\[EVIDENCE:(.+?)\]/)
      if (match) names.add(match[1])
    }
    return names
  }, [documents])

  const fileByEvidence = useMemo(() => {
    const map = new Map<string, string>()
    for (const doc of documents) {
      const match = doc.description?.match(/\[EVIDENCE:(.+?)\]/)
      if (match) map.set(match[1], doc.file_name)
    }
    return map
  }, [documents])

  // Build flat rows — deduplicated by (domainCode, name) to avoid showing
  // the same evidence multiple times when it's referenced by several controls.
  const allRows: CatalogRow[] = useMemo(() => {
    const groups = new Map<string, CatalogRow>()
    for (const item of evidenceByControl) {
      for (const ev of item.evidences) {
        const key = `${item.domainCode}::${ev.name}`
        const existing = groups.get(key)
        if (existing) {
          existing.evidenceIds.push(ev.id)
          if (!existing.controlCodes.includes(item.control.code)) existing.controlCodes.push(item.control.code)
          if (ev.is_required) existing.isRequired = true
          if (requestedIds.has(ev.id)) existing.requested = true
        } else {
          groups.set(key, {
            evidenceIds: [ev.id],
            name: ev.name,
            description: ev.description,
            isRequired: ev.is_required, // catalog default — overrides applied at render time
            controlCodes: [item.control.code],
            domainCode: item.domainCode,
            domainName: item.domainName,
            requested: requestedIds.has(ev.id),
            received: uploadedNames.has(ev.name),
            fileName: fileByEvidence.get(ev.name) ?? null,
          })
        }
      }
    }
    // Apply mission-level override on isRequired
    for (const row of groups.values()) {
      row.isRequired = isEssential(row.name, row.isRequired)
      row.controlCodes.sort()
    }
    return [...groups.values()]
  }, [evidenceByControl, requestedIds, uploadedNames, fileByEvidence, isEssential])

  // Catalog default `is_required` value per evidence name (any catalog entry that is required → true)
  const catalogIsRequiredByName = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const item of evidenceByControl) {
      for (const ev of item.evidences) {
        if (ev.is_required) map.set(ev.name, true)
        else if (!map.has(ev.name)) map.set(ev.name, false)
      }
    }
    return map
  }, [evidenceByControl])

  // Counts
  const requestedCount = allRows.filter((r) => r.requested).length
  const receivedCount = allRows.filter((r) => r.requested && r.received).length
  const pendingCount = allRows.filter((r) => r.requested && !r.received).length
  const notRequestedCount = allRows.filter((r) => !r.requested).length

  // Filter + search
  const filteredRows = useMemo(() => {
    let rows = allRows
    if (filter === 'requested') rows = rows.filter((r) => r.requested)
    else if (filter === 'received') rows = rows.filter((r) => r.requested && r.received)
    else if (filter === 'pending') rows = rows.filter((r) => r.requested && !r.received)
    // 'all' shows everything

    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        r.controlCodes.some((c) => c.toLowerCase().includes(q))
      )
    }
    return rows
  }, [allRows, filter, search])

  // Group by domain
  const domainGroups = useMemo(() => {
    const groups = new Map<string, { code: string; name: string; rows: CatalogRow[] }>()
    for (const row of filteredRows) {
      const existing = groups.get(row.domainCode)
      if (existing) {
        existing.rows.push(row)
      } else {
        groups.set(row.domainCode, { code: row.domainCode, name: row.domainName, rows: [row] })
      }
    }
    return [...groups.values()].sort((a, b) => a.code.localeCompare(b.code))
  }, [filteredRows])

  // Auto-expand domains that have requested items
  useEffect(() => {
    if (filter === 'requested' || filter === 'pending' || filter === 'received') {
      setExpandedDomains(new Set(domainGroups.map((g) => g.code)))
    }
  }, [filter])

  const toggleDomain = (code: string): void => {
    setExpandedDomains((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  /** Toggle selection for a deduplicated row — adds/removes all underlying evidence IDs together */
  const toggleSelect = (evidenceIds: string[]): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      const anySelected = evidenceIds.some((id) => next.has(id))
      if (anySelected) {
        evidenceIds.forEach((id) => next.delete(id))
      } else {
        evidenceIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const handleSubmitRequest = async (): Promise<void> => {
    if (selected.size === 0) return
    const ok = await requestEvidence(missionId, Array.from(selected))
    if (ok) {
      setSelected(new Set())
      refetchRequests()
    }
  }

  if (catLoading) return <></>
  if (allRows.length === 0) return <></>

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'requested', label: 'Demand\u00e9es', count: requestedCount },
    { key: 'all', label: 'Catalogue complet', count: allRows.length },
    { key: 'received', label: 'Re\u00e7ues', count: receivedCount },
    { key: 'pending', label: 'En attente', count: pendingCount },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2 flex-wrap">
        <Paperclip size={15} className="text-forest-700" />
        <span className="text-[13px] font-semibold text-gray-900">Suivi des preuves</span>
        <div className="flex gap-1.5 ml-auto flex-wrap">
          <Badge label={`${requestedCount} demand\u00e9es`} variant="blue" />
          <Badge label={`${receivedCount} re\u00e7ues`} variant="green" />
          {pendingCount > 0 && <Badge label={`${pendingCount} en attente`} variant="gold" />}
          {filter === 'all' && <Badge label={`${notRequestedCount} non demand\u00e9es`} variant="gray" />}
        </div>
      </div>

      {/* Filters + search */}
      <div className="px-5 py-2.5 border-b border-gray-100 flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
              filter === f.key
                ? 'bg-forest-700 text-white'
                : 'text-gray-500 bg-white border border-gray-200 hover:bg-forest-50'
            }`}
          >
            {f.label}
            <span className={`text-[10px] font-semibold px-1 rounded-full ${
              filter === f.key ? 'bg-white/20' : 'bg-gray-100'
            }`}>{f.count}</span>
          </button>
        ))}

        {filter === 'all' && (
          <div className="ml-auto relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-[11px] outline-none focus:border-forest-500 w-52"
            />
          </div>
        )}

        {filter !== 'all' && (
          <button
            onClick={() => setFilter('all')}
            className="ml-auto text-[11px] text-forest-700 font-medium hover:underline flex items-center gap-1"
          >
            + Demander des preuves
          </button>
        )}
      </div>

      {/* Domain accordion list */}
      <div className="max-h-[500px] overflow-y-auto">
        {domainGroups.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-gray-300">
            Aucune preuve correspondante.
          </div>
        ) : (
          domainGroups.map((group) => {
            const isOpen = expandedDomains.has(group.code)
            const groupRequested = group.rows.filter((r) => r.requested)
            const groupReceived = group.rows.filter((r) => r.requested && r.received)
            const groupNotRequested = group.rows.filter((r) => !r.requested)

            return (
              <div key={group.code} className="border-b border-gray-100 last:border-b-0">
                {/* Domain header */}
                <button
                  onClick={() => toggleDomain(group.code)}
                  className="w-full flex items-center gap-2.5 px-5 py-2.5 bg-forest-50/50 hover:bg-forest-50 transition-colors text-left"
                >
                  {isOpen ? <ChevronDown size={14} className="text-forest-700" /> : <ChevronRight size={14} className="text-forest-700" />}
                  <span className="font-mono text-[11px] font-semibold text-forest-700">{group.code}</span>
                  <span className="text-[12px] font-semibold text-gray-700 flex-1">{group.name}</span>
                  <div className="flex gap-1.5">
                    {groupRequested.length > 0 && (
                      <span className="text-[9px] font-medium text-forest-700 bg-forest-100 px-2 py-0.5 rounded-full">
                        {groupRequested.length} demand{groupRequested.length > 1 ? '\u00e9es' : '\u00e9e'}
                      </span>
                    )}
                    {groupReceived.length > 0 && (
                      <span className="text-[9px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        {groupReceived.length} re\u00e7u{groupReceived.length > 1 ? 'es' : 'e'}
                      </span>
                    )}
                    {filter === 'all' && groupNotRequested.length > 0 && (
                      <span className="text-[9px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {groupNotRequested.length} non demand{groupNotRequested.length > 1 ? '\u00e9es' : '\u00e9e'}
                      </span>
                    )}
                  </div>
                </button>

                {/* Rows */}
                {isOpen && (
                  <div>
                    {/* Requested rows first */}
                    {group.rows.filter((r) => r.requested).map((row) => (
                      <EvidenceRow
                        key={row.evidenceIds.join(',')}
                        row={row}
                        showCheckbox={false}
                        checked={false}
                        onToggle={() => {}}
                        onToggleEssential={() => toggleOverride(row.name, catalogIsRequiredByName.get(row.name) ?? false)}
                        savingOverride={savingOverride}
                      />
                    ))}

                    {/* Separator if showing non-requested */}
                    {filter === 'all' && groupNotRequested.length > 0 && groupRequested.length > 0 && (
                      <div className="px-5 py-1.5 bg-gray-50 border-t border-b border-gray-100">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-300">Non demand{'\u00e9'}es &mdash; catalogue</span>
                      </div>
                    )}

                    {/* Not-requested rows (only in 'all' view) */}
                    {filter === 'all' && groupNotRequested.map((row) => (
                      <EvidenceRow
                        key={row.evidenceIds.join(',')}
                        row={row}
                        showCheckbox
                        checked={row.evidenceIds.some((id) => selected.has(id))}
                        onToggle={() => toggleSelect(row.evidenceIds)}
                        onToggleEssential={() => toggleOverride(row.name, catalogIsRequiredByName.get(row.name) ?? false)}
                        savingOverride={savingOverride}
                        dimmed
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Floating action bar */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 px-5 py-3 bg-white border-t border-gray-200 flex items-center gap-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <span className="text-[12px] text-gray-500">
            <span className="font-bold text-forest-700">{selected.size}</span> preuve{selected.size > 1 ? 's' : ''} s{'\u00e9'}lectionn{'\u00e9'}e{selected.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={handleSubmitRequest}
            disabled={requesting}
            className="flex items-center gap-1.5 px-4 py-2 bg-forest-700 text-white rounded-lg text-[12px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors"
          >
            <Send size={12} />
            {requesting ? 'Envoi...' : 'Demander au client'}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="px-3 py-2 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}

function EvidenceRow({ row, showCheckbox, checked, onToggle, dimmed, onToggleEssential, savingOverride }: {
  row: CatalogRow
  showCheckbox: boolean
  checked: boolean
  onToggle: () => void
  dimmed?: boolean
  onToggleEssential?: () => void
  savingOverride?: boolean
}): JSX.Element {
  return (
    <div className={`flex items-center gap-2.5 px-5 py-2 border-b border-gray-50 last:border-b-0 ${
      row.received ? 'bg-green-50/40' : dimmed ? 'opacity-50' : ''
    }`}>
      {showCheckbox ? (
        <button
          onClick={onToggle}
          className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            checked ? 'bg-forest-700 border-forest-700' : 'border-gray-200 hover:border-forest-300'
          }`}
        >
          {checked && <Check size={10} className="text-white" strokeWidth={3} />}
        </button>
      ) : (
        <div className="w-4 shrink-0" />
      )}

      {/* Status icon */}
      {row.received ? (
        <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center shrink-0">
          <Check size={10} className="text-white" strokeWidth={3} />
        </div>
      ) : row.requested ? (
        <Circle size={14} className="text-gold-500 shrink-0" />
      ) : (
        <div className="w-4 shrink-0" />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className={`text-[12px] font-medium ${dimmed ? 'text-gray-300' : 'text-gray-900'}`}>{row.name}</span>
        {row.description && (
          <span className={`text-[10px] ml-2 ${dimmed ? 'text-gray-200' : 'text-gray-400'}`}>{row.description}</span>
        )}
      </div>

      {/* Control codes (showing first 2, +N if more) */}
      <div className="flex gap-1 shrink-0">
        {row.controlCodes.slice(0, 2).map((code) => (
          <span key={code} className={`font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded ${
            dimmed ? 'bg-gray-100 text-gray-300' : 'bg-forest-50 text-forest-700'
          }`}>{code}</span>
        ))}
        {row.controlCodes.length > 2 && (
          <span className={`text-[9px] font-medium ${dimmed ? 'text-gray-300' : 'text-gray-400'}`}>
            +{row.controlCodes.length - 2}
          </span>
        )}
      </div>

      {/* File name if received */}
      {row.received && row.fileName && (
        <span className="text-[10px] font-medium text-green-600 truncate max-w-[120px]">{row.fileName}</span>
      )}

      {/* Status badge */}
      {row.received && <span className="text-[9px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full shrink-0">Re&ccedil;u</span>}
      {row.requested && !row.received && <span className="text-[9px] font-medium text-gold-600 bg-gold-50 px-2 py-0.5 rounded-full shrink-0">En attente</span>}

      {/* Essential star (toggle for cabinet, info-only otherwise) */}
      {onToggleEssential ? (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleEssential() }}
          disabled={savingOverride}
          className={`p-1 rounded transition-colors shrink-0 disabled:opacity-50 ${
            row.isRequired
              ? 'text-gold-500 hover:bg-gold-50'
              : 'text-gray-200 hover:text-gold-400 hover:bg-gold-50'
          }`}
          title={row.isRequired ? 'Marqu&eacute;e comme essentielle (cliquez pour retirer)' : 'Marquer comme essentielle pour cette mission'}
        >
          <Star size={14} fill={row.isRequired ? 'currentColor' : 'none'} />
        </button>
      ) : (
        row.isRequired && !row.received && (
          <span className="text-[8px] font-semibold text-gold-600 bg-gold-50 px-1.5 py-0.5 rounded shrink-0">Essentielle</span>
        )
      )}
    </div>
  )
}
