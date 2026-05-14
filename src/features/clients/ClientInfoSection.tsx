import { FormField } from '../../components/ui/FormField'
import { EFFECTIFS_OPTIONS, CHIFFRE_AFFAIRES_OPTIONS } from '../../lib/constants'

interface ClientInfoSectionProps {
  effectifs: string
  chiffreAffaires: string
  nombreSites: string
  activitesPrincipales?: string
  structureHierarchique?: string
  disabled: boolean
  onEffectifs: (v: string) => void
  onChiffreAffaires: (v: string) => void
  onNombreSites: (v: string) => void
  onActivitesPrincipales?: (v: string) => void
  onStructureHierarchique?: (v: string) => void
}

export function ClientInfoSection({
  effectifs, chiffreAffaires, nombreSites, disabled,
  onEffectifs, onChiffreAffaires, onNombreSites,
}: ClientInfoSectionProps) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-gray-900">Informations g&eacute;n&eacute;rales</legend>

      <div>
        <label htmlFor="client-effectifs" className="block text-sm font-medium text-gray-700">Effectifs</label>
        <select
          id="client-effectifs"
          value={effectifs}
          onChange={(e) => onEffectifs(e.target.value)}
          disabled={disabled}
          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
        >
          <option value="">S&eacute;lectionner</option>
          {EFFECTIFS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="client-ca" className="block text-sm font-medium text-gray-700">Chiffre d&apos;affaires</label>
        <select
          id="client-ca"
          value={chiffreAffaires}
          onChange={(e) => onChiffreAffaires(e.target.value)}
          disabled={disabled}
          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
        >
          <option value="">S&eacute;lectionner</option>
          {CHIFFRE_AFFAIRES_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <FormField id="client-sites" label="Nombre de sites" type="number" value={nombreSites} onChange={onNombreSites} disabled={disabled} />
    </fieldset>
  )
}
