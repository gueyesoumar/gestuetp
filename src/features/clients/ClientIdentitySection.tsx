import { FormField } from '../../components/ui/FormField'
import { SECTEURS_OPTIONS, PAYS_OPTIONS } from '../../lib/constants'

const selectClass = 'mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 disabled:bg-gray-50'

interface ClientIdentitySectionProps {
  clientName: string
  clientNameError?: string | null
  onClientNameBlur?: () => void
  emailDomain: string
  emailDomainError?: string | null
  onEmailDomainBlur?: () => void
  registrationNumber: string
  sector: string
  address: string
  city: string
  country: string
  website: string
  websiteError?: string | null
  onWebsiteBlur?: () => void
  phone: string
  phoneError?: string | null
  onPhoneBlur?: () => void
  disabled: boolean
  onClientName: (v: string) => void
  onEmailDomain: (v: string) => void
  onRegistrationNumber: (v: string) => void
  onSector: (v: string) => void
  onAddress: (v: string) => void
  onCity: (v: string) => void
  onCountry: (v: string) => void
  onWebsite: (v: string) => void
  onPhone: (v: string) => void
}

export function ClientIdentitySection({
  clientName, clientNameError, onClientNameBlur,
  emailDomain, emailDomainError, onEmailDomainBlur,
  registrationNumber, sector, address, city, country,
  website, websiteError, onWebsiteBlur,
  phone, phoneError, onPhoneBlur,
  disabled,
  onClientName, onEmailDomain, onRegistrationNumber, onSector, onAddress, onCity, onCountry, onWebsite, onPhone,
}: ClientIdentitySectionProps) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-gray-900">Identit&eacute; du client</legend>

      <FormField id="client-name" label="Nom du client" value={clientName} onChange={onClientName} onBlur={onClientNameBlur} error={clientNameError} required disabled={disabled} />

      <div className="grid grid-cols-2 gap-3">
        <FormField id="client-registration" label="N&deg; d&apos;immatriculation (NINEA, SIRET)" value={registrationNumber} onChange={onRegistrationNumber} disabled={disabled} />
        <FormField id="client-email-domain" label="Domaine email" value={emailDomain} onChange={onEmailDomain} onBlur={onEmailDomainBlur} error={emailDomainError} placeholder="ex : entreprise.com" disabled={disabled} />
      </div>

      <div>
        <label htmlFor="client-sector" className="block text-sm font-medium text-gray-700">Secteur d&apos;activit&eacute;</label>
        <select id="client-sector" value={sector} onChange={(e) => onSector(e.target.value)} disabled={disabled} className={selectClass}>
          <option value="">S&eacute;lectionner</option>
          {SECTEURS_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
        </select>
      </div>
      <FormField id="client-phone" label="T&eacute;l&eacute;phone" type="tel" value={phone} onChange={onPhone} onBlur={onPhoneBlur} error={phoneError} disabled={disabled} placeholder="+221 77 123 45 67" />
      <FormField id="client-website" label="Site web" type="url" value={website} onChange={onWebsite} onBlur={onWebsiteBlur} error={websiteError} placeholder="https://..." disabled={disabled} />
      <FormField id="client-address" label="Adresse" value={address} onChange={onAddress} disabled={disabled} />

      <div className="grid grid-cols-2 gap-3">
        <FormField id="client-city" label="Ville" value={city} onChange={onCity} disabled={disabled} />
        <div>
          <label htmlFor="client-country" className="block text-sm font-medium text-gray-700">Pays</label>
          <select id="client-country" value={country} onChange={(e) => onCountry(e.target.value)} disabled={disabled} className={selectClass}>
            <option value="">S&eacute;lectionner</option>
            {PAYS_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
          </select>
        </div>
      </div>
    </fieldset>
  )
}
