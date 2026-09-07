import { useSearchParams } from 'react-router-dom'
import { ProfileTab } from '../features/account/ProfileTab'
import { SecurityTab } from '../features/account/SecurityTab'
import { NotificationsTab } from '../features/account/NotificationsTab'
import { SessionsTab } from '../features/account/SessionsTab'

type Tab = 'profil' | 'securite' | 'notifications' | 'sessions'

const TABS: { key: Tab; label: string }[] = [
  { key: 'profil', label: 'Profil' },
  { key: 'securite', label: 'Sécurité' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'sessions', label: 'Sessions' },
]

/**
 * Hub « Mon compte » à onglets (Profil · Sécurité · Notifications · Sessions),
 * monté dans le shell de l'espace de travail — même présentation que le hub
 * Organisation. Onglet actif reflété dans l'URL (?tab=) pour le lien direct.
 */
export function AccountPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()

  const param = searchParams.get('tab')
  const activeTab: Tab = TABS.some((t) => t.key === param) ? (param as Tab) : 'profil'

  const selectTab = (key: Tab) =>
    setSearchParams(key === 'profil' ? {} : { tab: key }, { replace: true })

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Mon compte</h2>
        <p className="mt-1 text-[13px] text-gray-500">
          Vos informations personnelles et vos préférences — valables pour tous vos espaces.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => selectTab(tab.key)}
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

      {activeTab === 'profil' && <ProfileTab />}
      {activeTab === 'securite' && <SecurityTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'sessions' && <SessionsTab />}
    </div>
  )
}
