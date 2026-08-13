import { useOrganization } from '../organization/useOrganization'

/**
 * Co-branding de la top-bar du Hub : logo (si disponible) + nom de l'organisation
 * d'appartenance du profil connecté, accolé à la marque Gëstu par un filet
 * vertical — façon lockup. Rendu sur fond sombre. Rien tant que l'org n'est pas
 * chargée (ou absente).
 */
export function HubOrgIdentity(): JSX.Element | null {
  const { organization, loading } = useOrganization()

  if (loading || !organization) return null

  return (
    <div className="flex items-center gap-2.5 border-l border-white/15 pl-3">
      {organization.logo_url && (
        <img src={organization.logo_url} alt="" className="h-7 w-auto max-w-[110px] object-contain" />
      )}
      <span className="text-[15px] font-extrabold leading-tight tracking-tight text-white">{organization.name}</span>
    </div>
  )
}
