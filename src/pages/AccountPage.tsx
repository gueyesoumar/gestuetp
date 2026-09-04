import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AccountIdentityHeader } from '../features/account/AccountIdentityHeader'
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
 * Page « Mon compte » : hub à onglets (Profil · Sécurité · Notifications ·
 * Sessions), atteignable du menu utilisateur des deux espaces. L'onglet actif
 * est reflété dans l'URL (?tab=) pour permettre le lien direct (ex : Sécurité).
 */
export function AccountPage(): JSX.Element {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const param = searchParams.get('tab')
  const activeTab: Tab = TABS.some((t) => t.key === param) ? (param as Tab) : 'profil'

  const selectTab = (key: Tab) =>
    setSearchParams(key === 'profil' ? {} : { tab: key }, { replace: true })

  return (
    <div className="min-h-screen bg-page-bg">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-400 mb-4 hover:text-gray-600"
        >
          <ArrowLeft size={15} /> Retour
        </button>
        <h1 className="text-xl font-bold text-gray-900">Mon compte</h1>
        <p className="text-[13px] text-gray-500 mt-1 mb-6">
          Vos informations personnelles et vos préférences — valables pour tous vos espaces.
        </p>

        <AccountIdentityHeader />

        <div className="flex gap-6 border-b border-gray-200 mb-6">
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
    </div>
  )
}
