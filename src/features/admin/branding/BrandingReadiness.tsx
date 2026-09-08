import { CheckCircle2, AlertTriangle } from 'lucide-react'
import type { CabinetBrandingRow, CabinetDomainRow } from './useCabinetBrandingAdmin'

interface Props {
  branding: CabinetBrandingRow | null
  domains: CabinetDomainRow[]
}

/**
 * Récapitulatif « prêt pour la marque blanche » : indique ce qui est complet et
 * ce qui manque pour un rendu correct. Indicatif — l'activation effective passe
 * par le flag white_label_branding (onglet Feature flags).
 */
export function BrandingReadiness({ branding, domains }: Props): JSX.Element {
  const checks = [
    { label: 'Logo (fond clair) fourni', ok: Boolean(branding?.logo_light_url) },
    { label: 'Couleurs primaire et accent définies', ok: Boolean(branding?.primary_color && branding?.accent_color) },
    { label: 'Au moins un domaine vérifié', ok: domains.some((d) => d.is_verified) },
  ]
  const done = checks.filter((c) => c.ok).length
  const allReady = done === checks.length

  return (
    <section className={`rounded-lg border px-4 py-3 ${allReady ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[12.5px] font-bold text-gray-900">État de préparation</h3>
        <span className={`text-[11px] font-semibold ${allReady ? 'text-emerald-700' : 'text-amber-700'}`}>
          {done}/{checks.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-[12.5px]">
            {c.ok
              ? <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
              : <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />}
            <span className={c.ok ? 'text-gray-700' : 'text-gray-800 font-medium'}>{c.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[11.5px] leading-relaxed text-gray-600">
        {allReady
          ? 'Configuration complète. Activez la marque blanche via le flag white_label_branding (onglet Feature flags).'
          : 'Complétez les points manquants avant d’activer la marque blanche — sinon le rendu client sera dégradé (logo absent, couleurs par défaut, domaine non servi).'}
      </p>
    </section>
  )
}
