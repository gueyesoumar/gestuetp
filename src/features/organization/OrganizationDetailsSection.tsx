import { FormField } from '../../components/ui/FormField'
import { SECTEURS_OPTIONS, PAYS_OPTIONS } from '../../lib/constants'

const selectClass = 'mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100'

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

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label htmlFor="org-city" className="block text-[13px] font-medium text-gray-700 mb-1">Ville</label>
          <input id="org-city" type="text" value={city} onChange={(e) => onCity(e.target.value)} disabled={disabled}
            className="block w-full h-[38px] rounded-lg border border-gray-200 px-3 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 disabled:bg-gray-50" />
        </div>
        <div className="flex-1">
          <label htmlFor="org-country" className="block text-[13px] font-medium text-gray-700 mb-1">Pays</label>
          <select id="org-country" value={country} onChange={(e) => onCountry(e.target.value)} disabled={disabled}
            className="block w-full h-[38px] rounded-lg border border-gray-200 px-3 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 disabled:bg-gray-50 appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22%236B7280%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cpath%20d%3D%22M8%2011L3%206h10z%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_12px_center]">
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
        <label htmlFor="org-sector" className="block text-[13px] font-medium text-gray-700">Secteur d&apos;activit&eacute;</label>
        <select id="org-sector" value={sector} onChange={(e) => onSector(e.target.value)} disabled={disabled} className={selectClass}>
          <option value="">S&eacute;lectionner</option>
          {SECTEURS_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
        </select>
      </div>

      <FormField id="org-description" label="Description" value={description} onChange={onDescription} multiline disabled={disabled} placeholder="Pr&eacute;sentation de l&apos;organisation..." />
    </fieldset>
  )
}
