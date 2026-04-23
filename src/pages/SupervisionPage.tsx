import { useState, useMemo } from 'react'
import { Download, FileText } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useOrganizationHierarchy } from '../hooks/useOrganizationHierarchy'
import { useGroupPermissions } from '../hooks/useGroupPermissions'
import { useSupervisionData } from '../features/supervision/useSupervisionData'
import { CampaignListSection } from '../features/supervision/CampaignListSection'
import { SupervisionKPIs } from '../features/supervision/SupervisionKPIs'
import { SupervisionRanking } from '../features/supervision/SupervisionRanking'
import { SupervisionHeatmap } from '../features/supervision/SupervisionHeatmap'
import { SupervisionRisks } from '../features/supervision/SupervisionRisks'
import { SupervisionEvolution } from '../features/supervision/SupervisionEvolution'
import { SupervisionReport } from '../features/supervision/SupervisionReport'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import type { SupervisionMode } from '../features/supervision/useSupervisionData'

type Tab = 'classement' | 'heatmap' | 'risques' | 'evolution' | 'campagnes' | 'rapport'

export function SupervisionPage(): JSX.Element {
  const { profile } = useAuth()
  const { isGroup, isCabinet } = useOrganizationHierarchy(profile?.organization_id)
  const { canCreateCampaign, canViewSupervision } = useGroupPermissions()
  const [selectedFrameworkId, setSelectedFrameworkId] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('classement')
  const [sectorFilter, setSectorFilter] = useState('')

  // Determine available modes based on organization type
  const hasGroupMode = isGroup
  const hasCabinetMode = isCabinet
  const hasBothModes = isGroup && isCabinet

  // Default mode: group if group-only, cabinet if cabinet-only, group if both
  const defaultMode: SupervisionMode = hasGroupMode ? 'group' : 'cabinet'
  const [mode, setMode] = useState<SupervisionMode>(defaultMode)

  const { frameworks, entities, domains, loading, error } = useSupervisionData(selectedFrameworkId, mode)

  // Auto-select first framework once loaded
  if (frameworks.length > 0 && !selectedFrameworkId) {
    setSelectedFrameworkId(frameworks[0].id)
  }

  const selectedFramework = frameworks.find((f) => f.id === selectedFrameworkId)

  // Extract unique sectors for the filter
  const sectors = useMemo(() => {
    const set = new Set<string>()
    entities.forEach((e) => { if (e.sector) set.add(e.sector) })
    return [...set].sort()
  }, [entities])

  // Apply sector filter
  const filteredEntities = useMemo(() => {
    if (!sectorFilter) return entities
    return entities.filter((e) => e.sector === sectorFilter)
  }, [entities, sectorFilter])

  const baseTabs: { key: Tab; label: string; groupOnly?: boolean }[] = [
    { key: 'classement', label: 'Classement' },
    { key: 'heatmap', label: 'Heatmap' },
    { key: 'risques', label: 'Risques syst\u00e9miques' },
    { key: 'evolution', label: '\u00c9volution' },
    { key: 'campagnes', label: 'Campagnes', groupOnly: true },
    { key: 'rapport', label: 'Rapport' },
  ]

  const tabs = baseTabs.filter((t) => !t.groupOnly || hasGroupMode)

  const subtitle = mode === 'group'
    ? 'Vue consolid\u00e9e de la conformit\u00e9 des entit\u00e9s supervis\u00e9es'
    : 'Vue consolid\u00e9e de la conformit\u00e9 par r\u00e9f\u00e9rentiel et p\u00e9rim\u00e8tre'

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Supervision</h2>
          <p className="mt-1 text-[13px] text-gray-500">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition">
            <Download size={14} />
            Exporter
          </button>
          <button
            onClick={() => setActiveTab('rapport')}
            className="flex items-center gap-2 rounded-lg bg-forest-700 px-4 py-2 text-[13px] font-medium text-white hover:bg-forest-900 transition"
          >
            <FileText size={14} />
            G{'\u00e9'}n{'\u00e9'}rer le rapport
          </button>
        </div>
      </div>

      {/* Mode switch — only if org is both group + cabinet */}
      {hasBothModes && (
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => { setMode('group'); setSectorFilter('') }}
            className={`px-4 py-2 rounded-md text-[12px] font-semibold transition-colors ${
              mode === 'group'
                ? 'bg-white text-forest-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Toutes les entit{'\u00e9'}s
          </button>
          <button
            onClick={() => { setMode('cabinet'); setSectorFilter('') }}
            className={`px-4 py-2 rounded-md text-[12px] font-semibold transition-colors ${
              mode === 'cabinet'
                ? 'bg-white text-forest-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Mes audits
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Référentiel */}
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              R{'\u00e9'}f{'\u00e9'}rentiel
            </label>
            <select
              value={selectedFrameworkId}
              onChange={(e) => { setSelectedFrameworkId(e.target.value); setActiveTab('classement'); setSectorFilter('') }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] font-medium text-gray-900 outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
            >
              {frameworks.map((fw) => (
                <option key={fw.id} value={fw.id}>
                  {fw.name} {fw.version ? `v${fw.version}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Périmètre */}
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              P{'\u00e9'}rim{'\u00e8'}tre
            </label>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] font-medium text-gray-900 outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
            >
              <option value="">Toutes les entit{'\u00e9'}s ({entities.length})</option>
              {sectors.map((s) => {
                const count = entities.filter((e) => e.sector === s).length
                return (
                  <option key={s} value={s}>{s} ({count})</option>
                )
              })}
            </select>
          </div>

          {/* Période */}
          <div className="min-w-[180px]">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              P{'\u00e9'}riode
            </label>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] font-medium text-gray-900 outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
            >
              <option>Toutes les p{'\u00e9'}riodes</option>
            </select>
          </div>
        </div>

        {/* Framework info badge */}
        {selectedFramework && (
          <div className="mt-3 flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-forest-100 text-forest-700">
              {selectedFramework.name} {'\u2014'} {domains.length} domaines
            </span>
            {selectedFramework.publisher && (
              <span className="text-[11px] text-gray-400">{selectedFramework.publisher}</span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : (
        <>
          {/* KPIs */}
          <SupervisionKPIs entities={filteredEntities} />

          {/* Tabs */}
          <div className="flex gap-6 border-b border-gray-200 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-[13px] font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-forest-600 text-forest-700'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'classement' && <SupervisionRanking entities={filteredEntities} />}
          {activeTab === 'heatmap' && (
            <SupervisionHeatmap
              entities={filteredEntities}
              domains={domains}
              frameworkName={selectedFramework?.name ?? ''}
            />
          )}
          {activeTab === 'risques' && <SupervisionRisks entities={filteredEntities} domains={domains} />}
          {activeTab === 'evolution' && <SupervisionEvolution entities={filteredEntities} />}
          {activeTab === 'campagnes' && <CampaignListSection frameworks={frameworks} isGroup={hasGroupMode} canCreate={canCreateCampaign} />}
          {activeTab === 'rapport' && (
            <SupervisionReport
              entities={filteredEntities}
              frameworkName={selectedFramework?.name ?? ''}
              frameworkPublisher={selectedFramework?.publisher ?? null}
            />
          )}
        </>
      )}
    </div>
  )
}
