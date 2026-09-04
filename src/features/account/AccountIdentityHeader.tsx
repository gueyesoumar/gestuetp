import { useAuth } from '../../hooks/useAuth'
import { Badge } from '../../components/ui/Badge'

/**
 * Bandeau d'identité persistant en tête du hub « Mon compte » : avatar, nom,
 * email et statut. Affiché au-dessus des onglets, quel que soit l'onglet actif.
 */
export function AccountIdentityHeader(): JSX.Element | null {
  const { profile } = useAuth()
  if (!profile) return null

  const initials = `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`

  return (
    <div className="mb-6 flex items-center gap-5">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-forest-100 text-forest-700 text-xl font-bold">
        {initials}
      </div>
      <div>
        <div className="text-lg font-bold text-gray-900">{profile.first_name} {profile.last_name}</div>
        <div className="text-[13px] text-gray-500">{profile.email}</div>
        <div className="mt-1 flex gap-2">
          {profile.job_title && <Badge label={profile.job_title} variant="gold" />}
          <Badge label={profile.is_active ? 'Actif' : 'Inactif'} variant={profile.is_active ? 'green' : 'gray'} />
        </div>
      </div>
    </div>
  )
}
