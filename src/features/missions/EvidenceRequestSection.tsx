import { useState, useMemo } from 'react'
import { Badge } from '../../components/ui/Badge'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EvidenceDomainBlock } from './EvidenceDomainBlock'
import { useEvidenceCatalog } from './useEvidenceCatalog'
import { useMissionEvidenceRequests } from './useMissionEvidenceRequests'
import type { EvidenceByControl } from './useEvidenceCatalog'
import type { DomainWithControls } from '../frameworks/useFrameworkDetail'

interface EvidenceRequestSectionProps {
  missionId: string
  domains: DomainWithControls[]
}

export function EvidenceRequestSection({ missionId, domains }: EvidenceRequestSectionProps) {
  const { evidenceByControl, loading: catLoading } = useEvidenceCatalog(domains)
  const { requestedIds, requestEvidence, requesting, refetch } = useMissionEvidenceRequests(missionId)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const domainGroups = useMemo(() => {
    const groups = new Map<string, EvidenceByControl[]>()
    for (const item of evidenceByControl) {
      const list = groups.get(item.domainCode) ?? []
      list.push(item)
      groups.set(item.domainCode, list)
    }
    return groups
  }, [evidenceByControl])

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return domainGroups
    const q = search.toLowerCase()
    const result = new Map<string, EvidenceByControl[]>()
    for (const [code, controls] of domainGroups) {
      const filtered = controls
        .map((ctrl) => ({
          ...ctrl,
          evidences: ctrl.evidences.filter(
            (e) => e.name.toLowerCase().includes(q) || (e.description ?? '').toLowerCase().includes(q)
          ),
        }))
        .filter((ctrl) =>
          ctrl.evidences.length > 0 ||
          ctrl.control.code.toLowerCase().includes(q) ||
          ctrl.control.name.toLowerCase().includes(q)
        )
      if (filtered.length > 0) result.set(code, filtered)
    }
    return result
  }, [domainGroups, search])

  if (catLoading) return <LoadingSpinner message="Chargement du catalogue de preuves..." />

  if (evidenceByControl.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
        Aucune preuve d&eacute;finie dans le catalogue pour ce r&eacute;f&eacute;rentiel.
      </div>
    )
  }

  const handleToggle = (evidenceId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(evidenceId)) next.delete(evidenceId)
      else next.add(evidenceId)
      return next
    })
  }

  const handleSelectDomain = (domainCode: string) => {
    const ids = evidenceByControl
      .filter((e) => e.domainCode === domainCode)
      .flatMap((e) => e.evidences.map((ev) => ev.id))
      .filter((id) => !requestedIds.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
  }

  const handleSubmit = async () => {
    if (selected.size === 0) return
    const ok = await requestEvidence(missionId, Array.from(selected))
    if (ok) {
      setSelected(new Set())
      refetch()
    }
  }

  const totalRequested = requestedIds.size
  const totalAvailable = evidenceByControl.reduce((sum, e) => sum + e.evidences.length, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Demande de preuves</h4>
          <p className="text-xs text-gray-500">
            S&eacute;lectionnez les preuves &agrave; demander au client. Cliquez sur un domaine pour le d&eacute;plier.
          </p>
        </div>
        <Badge label={`${totalRequested}/${totalAvailable} demand&eacute;es`} variant={totalRequested === totalAvailable ? 'green' : 'blue'} />
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher une preuve, un contr&ocirc;le..."
        className="w-full max-w-md rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
      />

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-gold-200 bg-forest-50 px-4 py-3">
          <span className="text-sm text-forest-900">
            {selected.size} preuve{selected.size > 1 ? 's' : ''} s&eacute;lectionn&eacute;e{selected.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={handleSubmit}
            disabled={requesting}
            className="rounded bg-forest-700 px-3 py-1 text-sm font-medium text-white hover:bg-forest-900 disabled:opacity-50"
          >
            {requesting ? 'Envoi...' : 'Envoyer la demande'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {Array.from(filteredGroups.entries()).map(([domainCode, controls]) => (
          <EvidenceDomainBlock
            key={domainCode}
            domainCode={domainCode}
            domainName={controls[0].domainName}
            controls={controls}
            requestedIds={requestedIds}
            selected={selected}
            requesting={requesting}
            onToggle={handleToggle}
            onSelectDomain={handleSelectDomain}
          />
        ))}
      </div>
    </div>
  )
}
