import { FormField } from '../../components/ui/FormField'
import { SECTEURS_OPTIONS, PAYS_OPTIONS } from '../../lib/constants'

const selectClass = 'mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100'

interface OrganizationDetailsSectionProps {
  phone: string
  address: string
  city: string
  country: string
  registrationNumber: string
  sector: string
  description: string
  disabled: boolean
  onPhone: (v: string) => void
  onAddress: (v: string) => void
  onCity: (v: string) => void
  onCountry: (v: string) => void
  onRegistrationNumber: (v: string) => void
  onSector: (v: string) => void
  onDescription: (v: string) => void
}

export function OrganizationDetailsSection({
  phone, address, city, country, registrationNumber, sector, description, disabled,
  onPhone, onAddress, onCity, onCountry, onRegistrationNumber, onSector, onDescription,
}: OrganizationDetailsSectionProps) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-gray-900">Informations compl&eacute;mentaires</legend>

      <FormField id="org-phone" label="T&eacute;l&eacute;phone" type="tel" value={phone} onChange={onPhone} disabled={disabled} />

      <FormField id="org-address" label="Adresse" value={address} onChange={onAddress} disabled={disabled} />

      <div className="grid grid-cols-2 gap-3">
        <FormField id="org-city" label="Ville" value={city} onChange={onCity} disabled={disabled} />
        <div>
          <label htmlFor="org-country" className="block text-sm font-medium text-gray-700">Pays</label>
          <select id="org-country" value={country} onChange={(e) => onCountry(e.target.value)} disabled={disabled} className={selectClass}>
            <option value="">S&eacute;lectionner</option>
            {PAYS_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
          </select>
        </div>
      </div>

      <FormField
        id="org-registration"
        label="N&deg; d&apos;immatriculation (NINEA, SIRET...)"
        value={registrationNumber}
        onChange={onRegistrationNumber}
        disabled={disabled}
      />

      <div>
        <label htmlFor="org-sector" className="block text-sm font-medium text-gray-700">Secteur d&apos;activit&eacute;</label>
        <select id="org-sector" value={sector} onChange={(e) => onSector(e.target.value)} disabled={disabled} className={selectClass}>
          <option value="">S&eacute;lectionner</option>
          {SECTEURS_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
        </select>
      </div>

      <FormField id="org-description" label="Description" value={description} onChange={onDescription} multiline disabled={disabled} placeholder="Pr&eacute;sentation de l&apos;organisation..." />
    </fieldset>
  )
}
