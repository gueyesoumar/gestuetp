import { useState } from 'react'
import { useCabinetBrandingAdmin } from './useCabinetBrandingAdmin'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { LogoUploadField } from './LogoUploadField'
import { BrandingFormSection } from './BrandingFormSection'
import { DomainsSection } from './DomainsSection'
import { Info } from 'lucide-react'
import type { ExtractedColors } from '../../branding/extractColorsFromImage'

interface Props {
  cabinetId: string
}

/**
 * Onglet "Marque blanche" sur la fiche organisation (admin only).
 *
 * Trois sections :
 *   - Identité visuelle  : dual-logo (Option D : light requis + dark optionnel)
 *   - Couleurs / emails  : primary, accent, support_email, email_from_name, footer
 *   - Domaines           : niveau 3, hostnames CNAME + DNS verification
 *
 * L'activation effective passe par le flag white_label_branding (onglet Feature
 * flags). Cet onglet ne fait que persister la config.
 */
export function CabinetWhiteLabelTab({ cabinetId }: Props): JSX.Element {
  const { branding, domains, loading, error, refetch } = useCabinetBrandingAdmin(cabinetId)
  const [suggestedColors, setSuggestedColors] = useState<ExtractedColors | null>(null)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  const handleLightUploaded = (colors?: ExtractedColors | null) => {
    if (colors) setSuggestedColors(colors)
    refetch()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-blue-200 bg-blue-50 text-[12.5px] text-blue-900">
        <Info size={16} className="flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <b>Configuration ≠ activation.</b> Cette page persiste la marque blanche en base. L&apos;activation effective côté
          clients passe par le flag <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-blue-200">white_label_branding</code> dans l&apos;onglet
          Feature flags &mdash; couper le flag désactive instantanément la marque blanche sans perdre la config.
        </div>
      </div>

      <section>
        <h3 className="text-[13px] font-bold text-gray-900 mb-2 flex items-baseline gap-2">
          Identité visuelle
          <span className="text-[10px] font-bold uppercase tracking-wider text-gold-700 bg-gold-50 px-2 py-0.5 rounded-full">Stratégie hybride dual-logo</span>
        </h3>
        <p className="text-[12px] text-gray-500 mb-3 leading-relaxed">
          Deux variantes pour un rendu propre partout. Sans variante fond sombre, le logo principal est encadré dans une
          pastille blanche automatique &mdash; lisibilité garantie sur tous les écrans.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <LogoUploadField cabinetId={cabinetId} variant="light" currentUrl={branding?.logo_light_url ?? null} onUploaded={handleLightUploaded} />
          <LogoUploadField cabinetId={cabinetId} variant="dark" currentUrl={branding?.logo_dark_url ?? null} onUploaded={() => refetch()} />
        </div>
      </section>

      <section>
        <BrandingFormSection
          cabinetId={cabinetId}
          branding={branding}
          suggestedColors={suggestedColors}
          onSaved={() => { setSuggestedColors(null); refetch() }}
        />
      </section>

      <section>
        <DomainsSection cabinetId={cabinetId} domains={domains} onChanged={refetch} />
      </section>

      {branding?.updated_at && (
        <p className="text-[11px] text-gray-400 italic">
          Dernière modification : {new Date(branding.updated_at).toLocaleString('fr-FR')}
        </p>
      )}
    </div>
  )
}
