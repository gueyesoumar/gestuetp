import { useState } from 'react'
import { OrganizationInfoTab } from '../features/organization-settings/OrganizationInfoTab'
import { WorkflowSettingsTab } from '../features/organization-settings/WorkflowSettingsTab'
import { TerminologyEditor } from '../features/organization-settings/TerminologyEditor'
import { useCabinetPermissions } from '../hooks/useCabinetPermissions'

type Tab = 'organisation' | 'parametres' | 'terminologie'

export function OrganizationPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('organisation')
  const { canEditOrganization } = useCabinetPermissions()

  const TABS: { key: Tab; label: string }[] = [
    { key: 'organisation', label: 'Organisation' },
    { key: 'parametres', label: 'Paramètres' },
    ...(canEditOrganization ? [{ key: 'terminologie' as Tab, label: 'Terminologie' }] : []),
  ]

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Organisation</h2>
        <p className="mt-1 text-[13px] text-gray-500">
          Gérez votre cabinet et les paramètres opérationnels.
        </p>
      </div>

      <div className="flex gap-6 border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
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

      {activeTab === 'organisation' && <OrganizationInfoTab />}
      {activeTab === 'parametres' && <WorkflowSettingsTab />}
      {activeTab === 'terminologie' && <TerminologyEditor />}
    </div>
  )
}
