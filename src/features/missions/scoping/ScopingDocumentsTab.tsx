import { useState, useMemo } from 'react'
import { Badge } from '../../../components/ui/Badge'
import { useMissionDocuments } from '../useMissionDocuments'
import { useMissionEvidenceRequests } from '../useMissionEvidenceRequests'
import { useEvidenceCatalog } from '../useEvidenceCatalog'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { Document, MissionEvidenceRequest } from '../../../types/database.types'

interface ScopingDocumentsTabProps {
  missionId: string
  domains: DomainWithControls[]
}

export function ScopingDocumentsTab({ missionId, domains }: ScopingDocumentsTabProps) {
  const { documents, loading: docLoading } = useMissionDocuments(missionId)
  const { requests, requestedIds, requestEvidence, requesting, loading: reqLoading } = useMissionEvidenceRequests(missionId)
  const { evidenceByControl, loading: catLoading } = useEvidenceCatalog(domains)
  const [filter, setFilter] = useState<'all' | 'received' | 'pending'>('all')

  const docByEvidence = useMemo(() => {
    const map = new Map<string, Document>()
    for (const doc of documents) {
      if (doc.evidence_request_id) map.set(doc.evidence_request_id, doc)
    }
    return map
  }, [documents])

  const requestByEvidence = useMemo(() => {
    const map = new Map<string, MissionEvidenceRequest>()
    for (const req of requests) {
      map.set(req.evidence_catalog_id, req)
    }
    return map
  }, [requests])

  const receivedCount = requests.filter((r) => r.status === 'uploaded' || r.status === 'validated').length
  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const totalRequested = requests.length

  if (docLoading || reqLoading || catLoading) return <LoadingSpinner />

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <FilterBtn label="Tout" count={totalRequested} active={filter === 'all'} onClick={() => setFilter('all')} />
          <FilterBtn label="Re&ccedil;us" count={receivedCount} active={filter === 'received'} onClick={() => setFilter('received')} />
          <FilterBtn label="En attente" count={pendingCount} active={filter === 'pending'} onClick={() => setFilter('pending')} />
        </div>
        <div className="flex gap-2">
          <Badge label={`${receivedCount} re\u00e7us`} variant="green" />
          <Badge label={`${pendingCount} en attente`} variant="gold" />
        </div>
      </div>

      {/* Crossed view: domain → control → evidence → document */}
      {evidenceByControl.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Aucune preuve d&eacute;finie dans le catalogue pour ce r&eacute;f&eacute;rentiel.</p>
      ) : (
        <div className="space-y-3">
          {groupByDomain(evidenceByControl).map(([domainCode, domainName, controls]) => (
            <DomainEvidenceGroup key={domainCode} code={domainCode} name={domainName}
              controls={controls} requestByEvidence={requestByEvidence} docByEvidence={docByEvidence}
              requestedIds={requestedIds} filter={filter} missionId={missionId}
              onRequest={requestEvidence} requesting={requesting} />
          ))}
        </div>
      )}

      {/* Upload zone for unlinked documents */}
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-forest-300 hover:bg-forest-50 transition-colors cursor-pointer"
        onClick={() => { /* TODO: trigger file input */ }}>
        <p className="text-xl text-gray-300 mb-1">&#128206;</p>
        <p className="text-xs text-gray-500">Glissez-d&eacute;posez ou <span className="text-forest-700 font-medium underline">parcourir</span> pour ajouter un document</p>
        <p className="text-[10px] text-gray-300 mt-1">PDF, Excel, Word, images &mdash; 25 Mo max</p>
      </div>
    </div>
  )
}

function DomainEvidenceGroup({ code, name, controls, requestByEvidence, docByEvidence, requestedIds, filter, missionId, onRequest, requesting }: {
  code: string; name: string
  controls: { controlCode: string; controlName: string; evidences: { id: string; name: string; description: string | null; is_required: boolean }[] }[]
  requestByEvidence: Map<string, MissionEvidenceRequest>; docByEvidence: Map<string, Document>
  requestedIds: Set<string>; filter: string; missionId: string
  onRequest: (missionId: string, ids: string[]) => Promise<boolean>; requesting: boolean
}) {
  const [open, setOpen] = useState(true)

  const domainReceived = controls.reduce((s, c) => s + c.evidences.filter((e) => {
    const req = requestByEvidence.get(e.id)
    return req && (req.status === 'uploaded' || req.status === 'validated')
  }).length, 0)
  const domainTotal = controls.reduce((s, c) => s + c.evidences.filter((e) => requestedIds.has(e.id)).length, 0)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-forest-50 transition-colors">
        <svg className={`w-3.5 h-3.5 text-gray-300 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        <span className="text-[11px] font-mono font-semibold text-forest-700">{code}</span>
        <span className="text-xs font-semibold text-gray-900 flex-1">{name}</span>
        {domainTotal > 0 && <Badge label={`${domainReceived}/${domainTotal} re\u00e7us`} variant={domainReceived === domainTotal ? 'green' : 'gold'} />}
      </button>

      {open && controls.map((ctrl) => (
        <div key={ctrl.controlCode} className="border-t border-gray-100">
          <div className="bg-gray-50 px-4 py-2 flex items-center gap-2">
            <span className="text-[10px] font-mono text-forest-700 font-medium">{ctrl.controlCode}</span>
            <span className="text-[11px] text-gray-700">{ctrl.controlName}</span>
          </div>
          {ctrl.evidences.map((ev) => {
            const req = requestByEvidence.get(ev.id)
            const isRequested = requestedIds.has(ev.id)
            const isReceived = req && (req.status === 'uploaded' || req.status === 'validated')
            const doc = req ? docByEvidence.get(req.id) : undefined

            if (filter === 'received' && !isReceived) return null
            if (filter === 'pending' && (!isRequested || isReceived)) return null

            return (
              <div key={ev.id} className={`flex items-center gap-3 px-4 py-2 pl-10 border-t border-gray-50 ${isReceived ? 'bg-green-50' : ''}`}>
                <EvidenceStatusIcon requested={isRequested} received={!!isReceived} />
                <div className="flex-1 min-w-0">
                  <span className={`text-[11px] ${isReceived ? 'text-green-800' : 'text-gray-700'}`}>{ev.name}</span>
                  {doc && <span className="text-[10px] text-green-600 ml-2">&rarr; {doc.file_name}</span>}
                  {isRequested && !isReceived && <span className="text-[10px] text-amber-500 ml-2">En attente</span>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {ev.is_required && <Badge label="Requis" variant="red" />}
                  {isReceived && <Badge label="Re&ccedil;u" variant="green" />}
                  {isRequested && !isReceived && <Badge label="Demand&eacute;" variant="gold" />}
                  {!isRequested && (
                    <button onClick={() => onRequest(missionId, [ev.id])} disabled={requesting}
                      className="text-[10px] text-forest-700 bg-forest-50 border border-forest-300 px-2 py-0.5 rounded hover:bg-forest-100 disabled:opacity-40">
                      Demander
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function EvidenceStatusIcon({ requested, received }: { requested: boolean; received: boolean }) {
  if (received) return <span className="text-green-600 text-sm">&#10003;</span>
  if (requested) return <span className="text-amber-500 text-sm">&#9202;</span>
  return <span className="text-gray-300 text-sm">&#9675;</span>
}

function FilterBtn({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${active ? 'bg-forest-700 text-white' : 'text-gray-500 bg-white border border-gray-200 hover:bg-forest-50'}`}>
      {label} <span className={`text-[10px] font-semibold px-1 rounded-full ${active ? 'bg-white/20' : 'bg-gray-100'}`}>{count}</span>
    </button>
  )
}

function groupByDomain(evidenceByControl: { control: { code: string; name: string }; domainCode: string; domainName: string; evidences: { id: string; name: string; description: string | null; is_required: boolean }[] }[]):
  [string, string, { controlCode: string; controlName: string; evidences: { id: string; name: string; description: string | null; is_required: boolean }[] }[]][] {
  const map = new Map<string, { name: string; controls: { controlCode: string; controlName: string; evidences: { id: string; name: string; description: string | null; is_required: boolean }[] }[] }>()
  for (const item of evidenceByControl) {
    if (!map.has(item.domainCode)) map.set(item.domainCode, { name: item.domainName, controls: [] })
    map.get(item.domainCode)!.controls.push({ controlCode: item.control.code, controlName: item.control.name, evidences: item.evidences })
  }
  return Array.from(map.entries()).map(([code, { name, controls }]) => [code, name, controls])
}
