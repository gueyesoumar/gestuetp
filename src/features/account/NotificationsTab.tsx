import { useAuth } from '../../hooks/useAuth'
import { EmailPreferencesSection } from '../profile/EmailPreferencesSection'
import { InAppPreferencesSection } from '../notifications/InAppPreferencesSection'

/** Onglet Notifications : préférences in-app (cloche) + e-mail de l'utilisateur. */
export function NotificationsTab(): JSX.Element | null {
  const { profile } = useAuth()
  if (!profile) return null

  return (
    <div className="space-y-6">
      <InAppPreferencesSection userId={profile.id} />
      <EmailPreferencesSection userId={profile.id} />
    </div>
  )
}
