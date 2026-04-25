import { useState, useMemo, useEffect } from 'react'
import { Sparkles, FileText, Send, ChevronDown, ChevronRight, Check, Circle, Star, Paperclip } from 'lucide-react'
import { useEvidenceCatalog } from '../useEvidenceCatalog'
import { useMissionEvidenceRequests } from '../useMissionEvidenceRequests'
import { useMissionDocuments } from '../useMissionDocuments'
import { supabase } from '../../../lib/supabase'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { MissionExclusion } from '../../../types/database.types'

interface ScopingDocumentsTabProps {
  missionId: string
  domains: DomainWithControls[]
  exclusions: MissionExclusion[]
}

export function ScopingDocumentsTab({ missionId, domains, exclusions }: ScopingDocumentsTabProps): JSX.Element {
  const { evidenceByControl, loading: catLoading } = useEvidenceCatalog(domains)
  const { requestedIds, requestEvidence, requesting, refetch } = useMissionEvidenceRequests(missionId)
  const { documents } = useMissionDocuments(missionId)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set())
  const [requestedNames, setRequestedNames] = useState<Set<string>>(new Set())

  // Excluded control IDs
  const excludedControlIds = useMemo(() => new Set(exclusions.map((e) => e.control_id)), [exclusions])

  // Build evidence list filtered by scope (excluding out-of-scope controls)
  const evidenceInScope = useMemo(() => {
    return evidenceByControl
      .filter((e) => !excludedControlIds.has(e.control.id))
  }, [evidenceByControl, excludedControlIds])

  // Essential evidence (is_required = true), deduplicated by name
  const essentialEvidence = useMemo(() => {
    const map = new Map<string, { id: string; name: string; description: string | null; controls: string[] }>()
    for (const item of evidenceInScope) {
      for (const ev of item.evidences) {
        if (!ev.is_required) continue
        const existing = map.get(ev.name)
        if (existing) {
          if (!existing.controls.includes(item.control.code)) existing.controls.push(item.control.code)
        } else {
          map.set(ev.name, {
            id: ev.id,
            name: ev.name,
            description: ev.description,
            controls: [item.control.code],
          })
        }
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [evidenceInScope])

  // Catalog grouped by domain
  const domainGroups = useMemo(() => {
    const groups = new Map<string, { domainCode: string; domainName: string; items: typeof evidenceInScope }>()
    for (const item of evidenceInScope) {
      const existing = groups.get(item.domainCode)
      if (existing) existing.items.push(item)
      else groups.set(item.domainCode, { domainCode: item.domainCode, domainName: item.domainName, items: [item] })
    }
    return [...groups.values()].sort((a, b) => a.domainCode.localeCompare(b.domainCode))
  }, [evidenceInScope])

  // Resolve catalog IDs → names for matching against uploaded docs
  useEffect(() => {
    if (requestedIds.size === 0) { setRequestedNames(new Set()); return }
    const ids = [...requestedIds]
    supabase
      .from('evidence_catalog')
      .select('name')
      .in('id', ids)
      .then(({ data }) => {
        setRequestedNames(new Set((data ?? []).map((d) => d.name)))
      })
  }, [requestedIds])

  // Map evidence name → uploaded?
  const uploadedNames = useMemo(() => {
    const set = new Set<string>()
    for (const doc of documents) {
      const m = doc.description?.match(/\[EVIDENCE:(.+?)\]/)
      if (m) set.add(m[1])
    }
    return set
  }, [documents])

  // Counts
  const requestedCount = requestedNames.size
  const receivedCount = [...requestedNames].filter((n) => uploadedNames.has(n)).length
  const pendingCount = requestedCount - receivedCount
  const essentialNotRequested = essentialEvidence.filter((e) => !requestedIds.has(e.id))

  const toggleSelected = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllEssential = (): void => {
    setSelected(new Set(essentialNotRequested.map((e) => e.id)))
  }

  const toggleDomain = (code: string): void => {
    setExpandedDomains((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const handleSubmit = async (): Promise<void> => {
    if (selected.size === 0) return
    const ok = await requestEvidence(missionId, [...selected])
    if (ok) {
      setSelected(new Set())
      refetch()
    }
  }

  if (catLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-forest-300 border-t-forest-700 rounded-full animate-spin" />
      </div>
    )
  }

  if (evidenceInScope.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <Paperclip size={28} className="text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">
          Aucune preuve d{'é'}finie dans le catalogue pour ce r{'é'}f{'é'}rentiel.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="flex items-center gap-3 px-4 py-3 bg-forest-50 border border-forest-100 rounded-xl">
        <Sparkles size={16} className="text-forest-700 shrink-0" />
        <p className="text-[12px] text-forest-700 leading-relaxed">
          Demandez les premiers documents au client pour pr{'é'}parer les travaux d{'\''}audit.
          Les demandes faites ici alimentent le suivi des preuves dans la Vue d{'\''}ensemble.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Demand{'é'}es</p>
          <p className="text-[22px] font-bold text-forest-700">{requestedCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Re{'ç'}ues</p>
          <p className="text-[22px] font-bold text-green-600">{receivedCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">En attente</p>
          <p className="text-[22px] font-bold text-gold-500">{pendingCount}</p>
        </div>
      </div>

      {/* Essentielles section */}
      {essentialNotRequested.length > 0 && (
        <div className="bg-white border border-gold-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-gold-50 border-b border-gold-200 flex items-center gap-2">
            <Star size={14} className="text-gold-600" />
            <span className="text-[13px] font-semibold text-gold-600">Preuves essentielles {'à'} demander en priorit{'é'}</span>
            <span className="ml-auto text-[10px] font-medium text-gold-600 bg-white px-2 py-0.5 rounded-full">
              {essentialNotRequested.length} preuve{essentialNotRequested.length > 1 ? 's' : ''}
            </span>
          </div>

          <div>
            {essentialNotRequested.map((ev) => {
              const isSelected = selected.has(ev.id)
              return (
                <button
                  key={ev.id}
                  onClick={() => toggleSelected(ev.id)}
                  className="w-full flex items-start gap-3 px-5 py-3 hover:bg-gold-50/40 border-b border-gray-50 last:border-b-0 text-left transition-colors"
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected ? 'bg-forest-700 border-forest-700' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium text-gray-900">{ev.name}</span>
                      {ev.controls.slice(0, 3).map((code) => (
                        <span key={code} className="font-mono text-[9px] font-semibold bg-forest-50 text-forest-700 px-1.5 py-0.5 rounded">{code}</span>
                      ))}
                      {ev.controls.length > 3 && <span className="text-[9px] text-gray-400">+{ev.controls.length - 3}</span>}
                    </div>
                    {ev.description && <p className="text-[11px] text-gray-400 mt-1">{ev.description}</p>}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="px-5 py-3 border-t border-gold-200 bg-gold-50/40 flex items-center gap-3">
            <button
              onClick={selectAllEssential}
              className="text-[11px] text-forest-700 font-medium hover:underline"
            >
              Tout s{'é'}lectionner ({essentialNotRequested.length})
            </button>
          </div>
        </div>
      )}

      {/* Catalogue complet */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2">
          <FileText size={14} className="text-gray-500" />
          <span className="text-[13px] font-semibold text-gray-700">Catalogue complet (par domaine)</span>
        </div>

        <div className="max-h-[480px] overflow-y-auto">
          {domainGroups.map((group) => {
            const isOpen = expandedDomains.has(group.domainCode)
            const totalInDomain = group.items.reduce((s, i) => s + i.evidences.length, 0)
            const requestedInDomain = group.items.reduce(
              (s, i) => s + i.evidences.filter((e) => requestedIds.has(e.id)).length, 0
            )

            return (
              <div key={group.domainCode} className="border-b border-gray-100 last:border-b-0">
                <button
                  onClick={() => toggleDomain(group.domainCode)}
                  className="w-full flex items-center gap-2.5 px-5 py-2.5 bg-forest-50/40 hover:bg-forest-50 transition-colors text-left"
                >
                  {isOpen ? <ChevronDown size={14} className="text-forest-700" /> : <ChevronRight size={14} className="text-forest-700" />}
                  <span className="font-mono text-[11px] font-semibold text-forest-700">{group.domainCode}</span>
                  <span className="text-[12px] font-semibold text-gray-700 flex-1">{group.domainName}</span>
                  <span className="text-[10px] text-gray-400">{requestedInDomain}/{totalInDomain} demand{'é'}{requestedInDomain > 1 ? 'es' : 'e'}</span>
                </button>

                {isOpen && (
                  <div className="bg-white">
                    {group.items.map((item) => (
                      <div key={item.control.id}>
                        <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                          <span className="font-mono text-[10px] font-semibold text-forest-700">{item.control.code}</span>
                          <span className="ml-2 text-[11px] text-gray-500">{item.control.name}</span>
                        </div>
                        {item.evidences.map((ev) => {
                          const isRequested = requestedIds.has(ev.id)
                          const isSelected = selected.has(ev.id)
                          const isReceived = uploadedNames.has(ev.name)
                          return (
                            <button
                              key={ev.id}
                              onClick={() => !isRequested && toggleSelected(ev.id)}
                              disabled={isRequested}
                              className={`w-full flex items-start gap-3 px-5 py-2.5 border-b border-gray-50 last:border-b-0 text-left transition-colors ${
                                isRequested ? 'bg-green-50/30 cursor-default' : 'hover:bg-forest-50/30 cursor-pointer'
                              }`}
                            >
                              {isRequested ? (
                                isReceived ? (
                                  <Check size={14} className="text-green-600 shrink-0 mt-0.5" />
                                ) : (
                                  <Circle size={14} className="text-gold-500 shrink-0 mt-0.5" />
                                )
                              ) : (
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                  isSelected ? 'bg-forest-700 border-forest-700' : 'border-gray-300'
                                }`}>
                                  {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[12px] ${isRequested ? 'text-gray-500' : 'text-gray-900'}`}>{ev.name}</span>
                                  {ev.is_required && !isRequested && (
                                    <span className="text-[8px] font-semibold text-gold-600 bg-gold-50 px-1.5 py-0.5 rounded">Essentiel</span>
                                  )}
                                  {isRequested && (
                                    <span className="text-[9px] font-medium text-forest-700 bg-forest-100 px-2 py-0.5 rounded-full ml-auto">
                                      {isReceived ? `Re${'ç'}ue` : `Demand${'é'}e`}
                                    </span>
                                  )}
                                </div>
                                {ev.description && <p className="text-[10px] text-gray-400 mt-0.5">{ev.description}</p>}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky action bar when selection is non-empty */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 bg-white border border-gray-200 rounded-xl p-4 shadow-lg flex items-center gap-4">
          <span className="text-[12px] text-gray-500">
            <span className="font-bold text-forest-700">{selected.size}</span> preuve{selected.size > 1 ? 's' : ''} s{'é'}lectionn{'é'}e{selected.size > 1 ? 's' : ''}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-2 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={requesting}
              className="flex items-center gap-1.5 px-4 py-2 bg-forest-700 text-white rounded-lg text-[12px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors"
            >
              <Send size={12} />
              {requesting ? 'Envoi...' : 'Demander au client'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
