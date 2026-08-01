import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ProfileSettingsTab } from '../features/organization-settings/ProfileSettingsTab'

/**
 * Page « Mon compte » dediee, autonome (hors chrome cabinet/admin) : atteignable
 * du menu utilisateur des deux espaces. Le corps reutilise ProfileSettingsTab
 * (identite, mot de passe, preferences) — edite uniquement l'utilisateur connecte.
 */
export function AccountPage(): JSX.Element {
  const navigate = useNavigate()

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
          Vos informations personnelles et vos pr&eacute;f&eacute;rences &mdash; valables pour tous vos espaces.
        </p>
        <ProfileSettingsTab />
      </div>
    </div>
  )
}
