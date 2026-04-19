import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { Badge } from '../../../components/ui/Badge'
import { useMissionDocuments } from '../useMissionDocuments'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'

interface ScopingDocumentsTabProps {
  missionId: string
  domains: DomainWithControls[]
}

interface ExpectedDoc {
  id: string
  name: string
  description: string | null
  isRequired: boolean
  controlCodes: string[]
  status: 'pending' | 'uploaded'
  uploadedFileName: string | null
}

export function ScopingDocumentsTab({ missionId, domains }: ScopingDocumentsTabProps): JSX.Element {
  const { documents, loading: docLoading } = useMissionDocuments(missionId)
  const [expectedDocs, setExpectedDocs] = useState<ExpectedDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'received' | 'pending'>('all')

  const fetchExpected = useCallback(async (): Promise<void> => {
    setLoading(true)
    const controlIds = domains.flatMap((d) => d.controls.map((c) => c.id))
    if (controlIds.length === 0) { setLoading(false); return }

    const controlCodeMap = Object.fromEntries(
      domains.flatMap((d) => d.controls.map((c) => [c.id, c.code]))
    )

    // Fetch evidence catalog
    const { data: catalogItems } = await supabase
      .from('evidence_catalog')
      .select('id, name, description, is_required, control_id')
      .in('control_id', controlIds)
      .order('sort_order')

    if (!catalogItems || catalogItems.length === 0) { setExpectedDocs([]); setLoading(false); return }

    // Build uploaded evidence names from documents
    const uploadedEvidenceNames = new Set<string>()
    const uploadedFileByEvidence = new Map<string, string>()
    for (const doc of documents) {
      if (doc.description) {
        const match = doc.description.match(/\[EVIDENCE:(.+?)\]/)
        if (match) {
          uploadedEvidenceNames.add(match[1])
          uploadedFileByEvidence.set(match[1], doc.file_name)
        }
      }
    }

    // Also match by control_id
    const uploadedControlIds = new Set(documents.filter((d) => d.control_id).map((d) => d.control_id))

    // Group by name, collect control codes
    const groups = new Map<string, { id: string; name: string; description: string | null; isRequired: boolean; controlCodes: string[]; controlIds: string[] }>()
    for (const cat of catalogItems) {
      const code = controlCodeMap[cat.control_id] ?? ''
      const existing = groups.get(cat.name)
      if (existing) {
        if (code && !existing.controlCodes.includes(code)) existing.controlCodes.push(code)
        if (!existing.controlIds.includes(cat.control_id)) existing.controlIds.push(cat.control_id)
        if (cat.is_required) existing.isRequired = true
      } else {
        groups.set(cat.name, {
          id: cat.id, name: cat.name, description: cat.description,
          isRequired: cat.is_required,
          controlCodes: code ? [code] : [],
          controlIds: [cat.control_id],
        })
      }
    }

    const result: ExpectedDoc[] = []
    for (const [, group] of groups) {
      const isUploaded = uploadedEvidenceNames.has(group.name) || group.controlIds.some((cid) => uploadedControlIds.has(cid))
      result.push({
        id: group.id, name: group.name, description: group.description,
        isRequired: group.isRequired,
        controlCodes: group.controlCodes.sort(),
        status: isUploaded ? 'uploaded' : 'pending',
        uploadedFileName: uploadedFileByEvidence.get(group.name) ?? (isUploaded ? documents.find((d) => group.controlIds.includes(d.control_id ?? ''))?.file_name ?? null : null),
      })
    }

    result.sort((a, b) => {
      if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
      return b.controlCodes.length - a.controlCodes.length
    })

    setExpectedDocs(result)
    setLoading(false)
  }, [domains, documents])

  useEffect(() => { fetchExpected() }, [fetchExpected])

  const pendingCount = expectedDocs.filter((d) => d.status === 'pending').length
  const uploadedCount = expectedDocs.filter((d) => d.status === 'uploaded').length

  const filtered = filter === 'all' ? expectedDocs : expectedDocs.filter((d) => filter === 'received' ? d.status === 'uploaded' : d.status === 'pending')

  if (docLoading || loading) return <LoadingSpinner />

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <FilterBtn label="Tout" count={expectedDocs.length} active={filter === 'all'} onClick={() => setFilter('all')} />
          <FilterBtn label="Re&ccedil;us" count={uploadedCount} active={filter === 'received'} onClick={() => setFilter('received')} />
          <FilterBtn label="En attente" count={pendingCount} active={filter === 'pending'} onClick={() => setFilter('pending')} />
        </div>
        <div className="flex gap-2">
          <Badge label={`${uploadedCount} re\u00e7us`} variant="green" />
          <Badge label={`${pendingCount} en attente`} variant="gold" />
        </div>
      </div>

      {/* Documents grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          {expectedDocs.length === 0 ? 'Aucune preuve d\u00e9finie dans le catalogue.' : 'Aucun document correspondant au filtre.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.map((doc) => (
            <div key={doc.id} className={`flex items-start gap-2.5 p-3 border rounded-lg ${
              doc.status === 'uploaded' ? 'bg-forest-50 border-forest-200' : 'bg-white border-gray-200'
            }`}>
              <span className="text-sm mt-0.5">{doc.status === 'uploaded' ? '\uD83D\uDCC4' : '\uD83D\uDCD5'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900">{doc.name}</p>
                {doc.description && <p className="text-[10px] text-gray-400 mt-0.5">{doc.description}</p>}
                <div className="flex gap-1 flex-wrap mt-1.5">
                  {doc.controlCodes.slice(0, 5).map((code) => (
                    <span key={code} className="font-mono text-[8px] font-semibold bg-forest-50 text-forest-700 px-1.5 py-0.5 rounded">{code}</span>
                  ))}
                  {doc.controlCodes.length > 5 && <span className="text-[8px] text-gray-300">+{doc.controlCodes.length - 5}</span>}
                </div>
                {doc.uploadedFileName && (
                  <p className="text-[10px] text-green-600 font-medium mt-1.5">&#10003; {doc.uploadedFileName}</p>
                )}
              </div>
              <div className="shrink-0 mt-0.5 flex flex-col items-end gap-1">
                {doc.isRequired && <span className="text-[8px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Requis</span>}
                {doc.status === 'uploaded' ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">&#10003;</span>
                  </div>
                ) : (
                  <span className="text-[9px] text-gold-600 bg-gold-50 px-2 py-0.5 rounded-full">En attente</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {expectedDocs.length > 0 && (
        <div className="flex items-center gap-2 p-2.5 bg-forest-50 border border-forest-100 rounded-lg">
          <span className="text-xs">&#128202;</span>
          <p className="text-[10px] text-forest-700">
            <b>{expectedDocs.length} documents</b> attendus.
            {uploadedCount > 0 && ` ${uploadedCount} re\u00e7u${uploadedCount > 1 ? 's' : ''}.`}
            {pendingCount > 0 && ` ${pendingCount} en attente.`}
          </p>
        </div>
      )}
    </div>
  )
}

function FilterBtn({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }): JSX.Element {
  return (
    <button onClick={onClick} className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${active ? 'bg-forest-700 text-white' : 'text-gray-500 bg-white border border-gray-200 hover:bg-forest-50'}`}>
      {label} <span className={`text-[10px] font-semibold px-1 rounded-full ${active ? 'bg-white/20' : 'bg-gray-100'}`}>{count}</span>
    </button>
  )
}
