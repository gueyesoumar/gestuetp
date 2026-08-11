import { useRef, useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Framework } from '../../../types/database.types'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'

interface MissionScopeStepProps {
  framework: Framework | null
  domains: DomainWithControls[]
  loading: boolean
  missionName: string
  onMissionName: (name: string) => void
  selectedControlIds: Set<string>
  onToggleControl: (controlId: string) => void
  onToggleDomain: (domainId: string) => void
  error?: string | null
}

export function MissionScopeStep({ framework, domains, loading, missionName, onMissionName, selectedControlIds, onToggleControl, onToggleDomain, error }: MissionScopeStepProps) {
  const totalControls = domains.reduce((sum, d) => sum + d.controls.length, 0)
  const retained = domains.reduce((sum, d) => sum + d.controls.filter((c) => selectedControlIds.has(c.id)).length, 0)

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900">Définissez le périmètre</h3>
      <p className="mt-1 text-[13px] text-gray-500">Nommez la mission et sélectionnez les contrôles à auditer</p>

      <div className="mt-4">
        <label className="block text-[12px] font-medium text-gray-700">Nom de la mission</label>
        <input
          type="text"
          value={missionName}
          onChange={(e) => onMissionName(e.target.value)}
          className="mt-1 w-full"
          placeholder="Ex : Audit ISO 27001 — Client Demo SA"
        />
      </div>

      {framework && (
        <div className="mt-4 flex items-center justify-between rounded-[10px] bg-forest-50 px-3.5 py-2.5">
          <span className="text-[13px] font-semibold text-gray-900">
            {framework.name} {framework.version ? `v${framework.version}` : ''}
          </span>
          <span className="text-[12px] font-semibold text-forest-700">{retained}/{totalControls} contrôles retenus</span>
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-[13px] text-gray-400">Chargement des contrôles...</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {domains.map((domain) => (
            <DomainScopeRow key={domain.id} domain={domain} selectedControlIds={selectedControlIds} onToggleControl={onToggleControl} onToggleDomain={onToggleDomain} />
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2 text-[12px] font-medium text-red-600 flex items-center gap-1">
          <span aria-hidden="true">!</span> {error}
        </p>
      )}
    </div>
  )
}

function DomainScopeRow({ domain, selectedControlIds, onToggleControl, onToggleDomain }: {
  domain: DomainWithControls
  selectedControlIds: Set<string>
  onToggleControl: (id: string) => void
  onToggleDomain: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLInputElement>(null)
  const selectedCount = domain.controls.filter((c) => selectedControlIds.has(c.id)).length
  const all = domain.controls.length > 0 && selectedCount === domain.controls.length
  const some = selectedCount > 0 && !all

  useEffect(() => {
    if (boxRef.current) boxRef.current.indeterminate = some
  }, [some])

  return (
    <div className={`rounded-[10px] border ${selectedCount > 0 ? 'border-forest-300' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <input ref={boxRef} type="checkbox" checked={all} onChange={() => onToggleDomain(domain.id)} className="accent-forest-700" />
        <span className="text-[12px] font-bold text-forest-700 font-mono w-8">{domain.code}</span>
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-1.5 text-left min-w-0">
          <ChevronRight size={14} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
          <span className="flex-1 text-[13px] text-gray-900 truncate">{domain.name}</span>
        </button>
        <span className="text-[11px] text-gray-400 shrink-0">{selectedCount}/{domain.controls.length}</span>
      </div>
      {open && (
        <div className="border-t border-gray-100 px-3.5 py-2 space-y-1">
          {domain.controls.map((c) => (
            <label key={c.id} className="flex items-center gap-2.5 py-0.5 cursor-pointer">
              <input type="checkbox" checked={selectedControlIds.has(c.id)} onChange={() => onToggleControl(c.id)} className="accent-forest-700" />
              <span className="text-[11px] font-mono text-gray-400 w-12 shrink-0">{c.code}</span>
              <span className="text-[12px] text-gray-700">{c.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
