import { useAuth } from '../../hooks/useAuth'
import { EmailPreferencesSection } from '../profile/EmailPreferencesSection'

/** Onglet Notifications : préférences de notifications e-mail de l'utilisateur. */
export function NotificationsTab(): JSX.Element | null {
  const { profile } = useAuth()
  if (!profile) return null

  return <EmailPreferencesSection userId={profile.id} />
}
