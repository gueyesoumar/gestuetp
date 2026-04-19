import { useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import type { EvidenceByControl } from './useEvidenceCatalog'

interface EvidenceDomainBlockProps {
  domainCode: string
  domainName: string
  controls: EvidenceByControl[]
  requestedIds: Set<string>
  selected: Set<string>
  requesting: boolean
  onToggle: (evidenceId: string) => void
  onSelectDomain: (domainCode: string) => void
}

export function EvidenceDomainBlock({
  domainCode, domainName, controls, requestedIds, selected, requesting,
  onToggle, onSelectDomain,
}: EvidenceDomainBlockProps) {
  const [open, setOpen] = useState(false)

  const domainRequestedCount = controls.reduce(
    (sum, c) => sum + c.evidences.filter((e) => requestedIds.has(e.id)).length, 0
  )
  const domainTotalCount = controls.reduce((sum, c) => sum + c.evidences.length, 0)
  const allDomainRequested = domainRequestedCount === domainTotalCount

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{open ? '\u25B2' : '\u25BC'}</span>
          <span className="text-sm font-mono font-semibold text-forest-700">{domainCode}</span>
          <span className="text-sm font-medium text-gray-900">{domainName}</span>
        </div>
        <Badge label={`${domainRequestedCount}/${domainTotalCount}`} variant={allDomainRequested ? 'green' : 'gray'} />
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {!allDomainRequested && (
            <div className="flex justify-end px-4 py-2 border-b border-gray-50">
              <button
                onClick={(e) => { e.stopPropagation(); onSelectDomain(domainCode) }}
                className="text-xs text-forest-700 hover:text-forest-900"
              >
                Tout s&eacute;lectionner
              </button>
            </div>
          )}

          {controls.map((ctrl) => (
            <div key={ctrl.control.id} className="border-b border-gray-50 last:border-b-0">
              <div className="bg-gray-50 px-4 py-2">
                <span className="text-xs font-mono text-forest-700">{ctrl.control.code}</span>
                <span className="ml-2 text-xs font-medium text-gray-700">{ctrl.control.name}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {ctrl.evidences.map((evidence) => {
                  const isRequested = requestedIds.has(evidence.id)
                  const isSelected = selected.has(evidence.id)
                  return (
                    <label
                      key={evidence.id}
                      className={`flex items-center gap-3 px-4 py-2 text-sm ${isRequested ? 'bg-green-50' : 'hover:bg-gray-50 cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isRequested || isSelected}
                        onChange={() => onToggle(evidence.id)}
                        disabled={isRequested || requesting}
                        className="rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <span className={isRequested ? 'text-green-800' : 'text-gray-900'}>{evidence.name}</span>
                        {evidence.description && (
                          <p className="text-xs text-gray-500">{evidence.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {evidence.is_required && <Badge label="Requis" variant="red" />}
                        {isRequested && <Badge label="Demand&eacute;e" variant="green" />}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
