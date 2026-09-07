import { useOrganization } from '../organization/useOrganization'

/**
 * Co-branding de la top-bar du Hub : filet dégradé + avatar de l'organisation
 * d'appartenance (logo si disponible, sinon initiales) + micro-label
 * « Organisation » et nom. Traité en SECONDAIRE par rapport à la marque
 * plateforme (hiérarchie — direction P1). Rien tant que l'org n'est pas chargée.
 */

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const from = words.length >= 2 ? words[0][0] + words[1][0] : name.trim().slice(0, 2)
  return from.toUpperCase()
}

export function HubOrgIdentity(): JSX.Element | null {
  const { organization, loading } = useOrganization()

  if (loading || !organization) return null

  return (
    <div className="flex items-center gap-3">
      {/* séparateur discret (unique) */}
      <div
        className="h-[34px] w-px"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.18), transparent)' }}
      />
      <div className="flex items-center gap-2.5">
        {organization.logo_url ? (
          <img src={organization.logo_url} alt="" className="h-[30px] w-[30px] rounded-[9px] object-contain" />
        ) : (
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] border border-white/[0.12] bg-white/[0.08] text-[11px] font-bold text-white/85">
            {initialsOf(organization.name)}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-px">
          <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/35">Organisation</div>
          <div className="truncate text-[14px] font-semibold leading-tight text-white/90">{organization.name}</div>
        </div>
      </div>
    </div>
  )
}
