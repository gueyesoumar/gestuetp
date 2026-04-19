import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { Badge } from '../../../components/ui/Badge'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { Document } from '../../../types/database.types'

interface EvidenceTrackerProps {
  missionId: string
  domains: DomainWithControls[]
  documents: Document[]
}

interface TrackedEvidence {
  name: string
  controlCodes: string[]
  isRequired: boolean
  status: 'uploaded' | 'pending'
  fileName: string | null
}

export function EvidenceTracker({ missionId, domains, documents }: EvidenceTrackerProps): JSX.Element {
  const [evidences, setEvidences] = useState<TrackedEvidence[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true)
    const controlIds = domains.flatMap((d) => d.controls.map((c) => c.id))
    if (controlIds.length === 0) { setLoading(false); return }

    const controlCodeMap = Object.fromEntries(
      domains.flatMap((d) => d.controls.map((c) => [c.id, c.code]))
    )

    const { data: catalogItems } = await supabase
      .from('evidence_catalog')
      .select('id, name, is_required, control_id')
      .in('control_id', controlIds)
      .order('sort_order')

    if (!catalogItems || catalogItems.length === 0) { setEvidences([]); setLoading(false); return }

    // Matching
    const uploadedEvidenceNames = new Set<string>()
    const uploadedFileMap = new Map<string, string>()
    for (const doc of documents) {
      if (doc.description) {
        const match = doc.description.match(/\[EVIDENCE:(.+?)\]/)
        if (match) {
          uploadedEvidenceNames.add(match[1])
          uploadedFileMap.set(match[1], doc.file_name)
        }
      }
    }
    const uploadedControlIds = new Set(documents.filter((d) => d.control_id).map((d) => d.control_id))

    // Group by name
    const groups = new Map<string, { name: string; isRequired: boolean; controlCodes: string[]; controlIds: string[] }>()
    for (const cat of catalogItems) {
      const code = controlCodeMap[cat.control_id] ?? ''
      const existing = groups.get(cat.name)
      if (existing) {
        if (code && !existing.controlCodes.includes(code)) existing.controlCodes.push(code)
        if (!existing.controlIds.includes(cat.control_id)) existing.controlIds.push(cat.control_id)
        if (cat.is_required) existing.isRequired = true
      } else {
        groups.set(cat.name, {
          name: cat.name, isRequired: cat.is_required,
          controlCodes: code ? [code] : [], controlIds: [cat.control_id],
        })
      }
    }

    const result: TrackedEvidence[] = []
    for (const [, g] of groups) {
      const isUploaded = uploadedEvidenceNames.has(g.name) || g.controlIds.some((cid) => uploadedControlIds.has(cid))
      result.push({
        name: g.name,
        controlCodes: g.controlCodes.sort(),
        isRequired: g.isRequired,
        status: isUploaded ? 'uploaded' : 'pending',
        fileName: uploadedFileMap.get(g.name) ?? (isUploaded ? documents.find((d) => g.controlIds.includes(d.control_id ?? ''))?.file_name ?? null : null),
      })
    }

    result.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
      if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1
      return b.controlCodes.length - a.controlCodes.length
    })

    setEvidences(result)
    setLoading(false)
  }, [domains, documents])

  useEffect(() => { fetchData() }, [fetchData])

  const pendingCount = evidences.filter((e) => e.status === 'pending').length
  const uploadedCount = evidences.filter((e) => e.status === 'uploaded').length
  const total = evidences.length
  const pct = total > 0 ? Math.round((uploadedCount / total) * 100) : 0

  if (loading || total === 0) return <></>

  const pendingRequired = evidences.filter((e) => e.status === 'pending' && e.isRequired)
  const pendingOther = evidences.filter((e) => e.status === 'pending' && !e.isRequired)
  const displayList = expanded ? evidences : [...pendingRequired.slice(0, 3), ...pendingOther.slice(0, 2)]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">&#128206;</span>
          <h3 className="text-sm font-bold">Suivi des preuves</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge label={`${uploadedCount} re\u00e7us`} variant="green" />
          {pendingCount > 0 && <Badge label={`${pendingCount} en attente`} variant="gold" />}
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-2 bg-forest-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-semibold text-forest-700">{pct}%</span>
        <span className="text-[10px] text-gray-300">{uploadedCount}/{total}</span>
      </div>

      {/* Document list */}
      <div className="space-y-1.5">
        {displayList.map((ev) => (
          <div key={ev.name} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${
            ev.status === 'uploaded' ? 'bg-green-50' : 'bg-white'
          }`}>
            {ev.status === 'uploaded' ? (
              <span className="text-green-600 text-xs">&#10003;</span>
            ) : (
              <span className="text-gold-500 text-xs">&#9675;</span>
            )}
            <span className={`text-[11px] flex-1 truncate ${ev.status === 'uploaded' ? 'text-green-800' : 'text-gray-700'}`}>
              {ev.name}
            </span>
            <div className="flex gap-1 shrink-0">
              {ev.controlCodes.slice(0, 2).map((c) => (
                <span key={c} className="font-mono text-[7px] font-semibold bg-forest-50 text-forest-700 px-1 py-0.5 rounded">{c}</span>
              ))}
              {ev.controlCodes.length > 2 && <span className="text-[7px] text-gray-300">+{ev.controlCodes.length - 2}</span>}
            </div>
            {ev.isRequired && ev.status === 'pending' && <span className="text-[7px] font-semibold text-red-500 bg-red-50 px-1 py-0.5 rounded">Requis</span>}
          </div>
        ))}
      </div>

      {/* Show more/less */}
      {total > 5 && (
        <button onClick={() => setExpanded(!expanded)} className="mt-2 w-full text-center text-[11px] text-forest-700 font-medium hover:underline">
          {expanded ? 'R\u00e9duire' : `Voir les ${total} documents \u2192`}
        </button>
      )}
    </div>
  )
}
