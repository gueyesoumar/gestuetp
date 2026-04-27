import { useState } from 'react'
import { OrganizationInfoTab } from '../features/organization-settings/OrganizationInfoTab'
import { ProfileSettingsTab } from '../features/organization-settings/ProfileSettingsTab'
import { WorkflowSettingsTab } from '../features/organization-settings/WorkflowSettingsTab'

type Tab = 'organisation' | 'profil' | 'parametres'

const TABS: { key: Tab; label: string }[] = [
  { key: 'organisation', label: 'Organisation' },
  { key: 'profil', label: 'Mon profil' },
  { key: 'parametres', label: 'Paramètres' },
]

export function OrganizationPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('organisation')

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Organisation</h2>
        <p className="mt-1 text-[13px] text-gray-500">
          Gérez votre cabinet, votre profil et les paramètres opérationnels.
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
      {activeTab === 'profil' && <ProfileSettingsTab />}
      {activeTab === 'parametres' && <WorkflowSettingsTab />}
    </div>
  )
}
