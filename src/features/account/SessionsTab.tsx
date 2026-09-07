import { useAuth } from '../../hooks/useAuth'
import { Badge } from '../../components/ui/Badge'

/** Onglet Sessions : informations sur la connexion en cours + déconnexion. */
export function SessionsTab(): JSX.Element | null {
  const { profile, session, signOut } = useAuth()
  if (!profile) return null

  const lastSignIn = profile.last_sign_in_at
    ? new Date(profile.last_sign_in_at).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="grid grid-cols-[240px_1fr]">
        <div className="bg-page-bg border-r border-gray-200 p-6">
          <h4 className="text-[14px] font-semibold text-gray-900">Session</h4>
          <p className="mt-1 text-[12px] leading-relaxed text-gray-500">Informations sur votre connexion</p>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-gray-500">Email de connexion</span>
            <span className="text-[13px] font-medium text-gray-900">{session?.user?.email}</span>
          </div>
          {lastSignIn && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-gray-500">Dernière connexion</span>
              <span className="text-[13px] font-medium text-gray-900">{lastSignIn}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-gray-500">Statut</span>
            <Badge label="Connecté" variant="green" />
          </div>
          <div className="pt-3 border-t border-gray-100">
            <button onClick={signOut} className="rounded-lg border border-red-200 px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors">
              Se déconnecter de cette session
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
