import type { Framework } from '../../../types/database.types'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'

interface MissionScopeStepProps {
  framework: Framework | null
  domains: DomainWithControls[]
  loading: boolean
  missionName: string
  onMissionName: (name: string) => void
  selectedDomainIds: Set<string>
  onToggleDomain: (domainId: string) => void
  error?: string | null
}

export function MissionScopeStep({ framework, domains, loading, missionName, onMissionName, selectedDomainIds, onToggleDomain, error }: MissionScopeStepProps) {
  const totalControls = domains.reduce((sum, d) => (selectedDomainIds.has(d.id) ? sum + d.controls.length : sum), 0)
  const selectedCount = domains.filter((d) => selectedDomainIds.has(d.id)).length

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900">Définissez le périmètre</h3>
      <p className="mt-1 text-[13px] text-gray-500">Nommez la mission et sélectionnez les domaines à auditer</p>

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
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-forest-100 text-[10px] font-extrabold text-forest-700">
              {framework.name.substring(0, 3)}
            </div>
            <span className="text-[13px] font-semibold text-gray-900">
              {framework.name} {framework.version ? `v${framework.version}` : ''}
            </span>
          </div>
          <span className="text-[12px] font-semibold text-forest-700">
            {selectedCount}/{domains.length} domaines
          </span>
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-[13px] text-gray-400">Chargement des domaines...</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {domains.map((domain) => {
            const checked = selectedDomainIds.has(domain.id)
            return (
              <label
                key={domain.id}
                className={`flex items-center gap-3 rounded-[10px] border px-3.5 py-2.5 cursor-pointer transition-all ${
                  checked ? 'border-forest-500 bg-forest-50' : 'border-gray-200 hover:border-forest-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleDomain(domain.id)}
                  className="accent-forest-700"
                />
                <span className="text-[12px] font-bold text-forest-700 font-mono w-8">{domain.code}</span>
                <span className="flex-1 text-[13px] text-gray-900">{domain.name}</span>
                <span className="text-[11px] text-gray-300">{domain.controls.length} contrôles</span>
              </label>
            )
          })}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between rounded-[10px] border border-gold-200 bg-gold-50 px-4 py-3">
        <span className="text-[12px] text-gold-600">Contrôles dans le périmètre</span>
        <span className="text-[14px] font-bold text-gold-600">{totalControls} contrôles</span>
      </div>

      {error && (
        <p className="mt-2 text-[12px] font-medium text-red-600 flex items-center gap-1">
          <span aria-hidden="true">!</span> {error}
        </p>
      )}
    </div>
  )
}
