import { MorphingShield } from '../../components/vault/MorphingShield'
import { useBranding } from '../branding/useBranding'
import { Logo } from '../branding/Logo'

// Lockup de marque du header (coin haut-gauche). Sur le domaine Gëstu : bouclier
// morphing (couleur cyclant sur les produits) + filet vertical + « Gëstu ETP »
// (ETP en or) + « Enterprise Trust Platform » aux initiales E·T·P dorées.
// Sur un domaine cabinet (branding) : logo + nom du cabinet, façon marque blanche.

export function BrandLockup(): JSX.Element {
  const { branding } = useBranding()

  if (branding) {
    return (
      <div className="flex items-center gap-3">
        <Logo variant="dark" height={30} />
        <div className="h-9 w-px bg-white/15" />
        <div>
          <div className="text-[18px] font-extrabold leading-tight text-white">{branding.cabinet_name}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
            Plateforme d&apos;audit
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <MorphingShield size={34} showLabel={false} />
      <div className="h-9 w-px bg-white/15" />
      <div>
        <div className="text-[20px] font-extrabold leading-tight text-white">
          G&euml;stu <span className="text-[#D4A843]">ETP</span>
        </div>
        <div className="mt-0.5 text-[11px] font-medium text-white/60">
          <span className="font-bold text-[#D4A843]">E</span>nterprise{' '}
          <span className="font-bold text-[#D4A843]">T</span>rust{' '}
          <span className="font-bold text-[#D4A843]">P</span>latform
        </div>
      </div>
    </div>
  )
}
