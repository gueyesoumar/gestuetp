import { useOrganization } from '../organization/useOrganization'

/**
 * Identité de l'organisation d'appartenance du profil connecté, affichée en
 * grand dans le Hub : logo (si disponible) + nom complet. Rendu sur fond sombre.
 */
export function HubOrgIdentity(): JSX.Element | null {
  const { organization, loading } = useOrganization()

  if (loading || !organization) return null

  return (
    <div className="flex shrink-0 items-center justify-center gap-3 py-1">
      {organization.logo_url && (
        <img
          src={organization.logo_url}
          alt=""
          className="h-9 w-auto max-w-[120px] object-contain"
        />
      )}
      <span className="text-center text-[clamp(18px,3cqmin,26px)] font-bold tracking-tight text-white">
        {organization.name}
      </span>
    </div>
  )
}
