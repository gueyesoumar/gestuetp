import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Organization, OrganizationUpdate } from '../../types/database.types'
import { SplitForm } from '../../components/ui/SplitForm'
import { SplitFormSection } from '../../components/ui/SplitFormSection'
import { FormField } from '../../components/ui/FormField'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { ORG_TYPE_OPTIONS, SECTEURS_OPTIONS, PAYS_OPTIONS } from '../../lib/constants'

interface OrganizationFormProps {
  organization: Organization
  onSubmit: (data: OrganizationUpdate) => Promise<boolean>
  submitting: boolean
  error: string | null
}

const selectClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100'

export function OrganizationForm({ organization, onSubmit, submitting, error }: OrganizationFormProps) {
  const [name, setName] = useState(organization.name)
  const [slug, setSlug] = useState(organization.slug)
  const [website, setWebsite] = useState(organization.website ?? '')
  const [types, setTypes] = useState<string[]>(organization.types)
  const [phone, setPhone] = useState(organization.phone ?? '')
  const [address, setAddress] = useState(organization.address ?? '')
  const [city, setCity] = useState(organization.city ?? '')
  const [country, setCountry] = useState(organization.country ?? '')
  const [registrationNumber, setRegistrationNumber] = useState(organization.registration_number ?? '')
  const [sector, setSector] = useState(organization.sector ?? '')
  const [description, setDescription] = useState(organization.description ?? '')
  const [success, setSuccess] = useState(false)

  const handleTypeToggle = (type: string) => {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSuccess(false)
    const ok = await onSubmit({
      name, slug, website: website || null, types,
      phone: phone || null, address: address || null, city: city || null,
      country: country || null, registration_number: registrationNumber || null,
      sector: sector || null, description: description || null,
    })
    if (ok) setSuccess(true)
  }

  return (
    <div className="max-w-3xl">
      {error && <div className="mb-4"><ErrorAlert message={error} /></div>}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-[13px] text-green-700">
          Organisation mise &agrave; jour.
        </div>
      )}

      <SplitForm onSubmit={handleSubmit} submitting={submitting}>
        <SplitFormSection title="Informations" description="Identit&eacute; de votre organisation sur la plateforme">
          <div className="space-y-4">
            <FormField id="org-name" label="Nom" value={name} onChange={setName} required disabled={submitting} />
            <FormField id="org-slug" label="Identifiant (slug)" value={slug} onChange={setSlug} required disabled={submitting} />
            <FormField id="org-website" label="Site web" type="url" value={website} onChange={setWebsite} placeholder="https://..." disabled={submitting} />
            <div>
              <span className="block text-[13px] font-medium text-gray-700">Type d&apos;organisation</span>
              <div className="mt-2 space-y-2">
                {ORG_TYPE_OPTIONS.map((t) => (
                  <label key={t.value} className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={types.includes(t.value)} onChange={() => handleTypeToggle(t.value)} disabled={submitting} className="rounded border-gray-300 accent-forest-700" />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </SplitFormSection>

        <SplitFormSection title="Coordonn&eacute;es" description="Adresse et informations de contact">
          <div className="space-y-4">
            <FormField id="org-phone" label="T&eacute;l&eacute;phone" type="tel" value={phone} onChange={setPhone} disabled={submitting} />
            <FormField id="org-address" label="Adresse" value={address} onChange={setAddress} disabled={submitting} />
            <div className="grid grid-cols-2 gap-4">
              <FormField id="org-city" label="Ville" value={city} onChange={setCity} disabled={submitting} />
              <div>
                <label htmlFor="org-country" className="block text-[13px] font-medium text-gray-700">Pays</label>
                <select id="org-country" value={country} onChange={(e) => setCountry(e.target.value)} disabled={submitting} className={selectClass}>
                  <option value="">S&eacute;lectionner</option>
                  {PAYS_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
                </select>
              </div>
            </div>
          </div>
        </SplitFormSection>

        <SplitFormSection title="Compl&eacute;mentaire" description="Immatriculation, secteur et pr&eacute;sentation">
          <div className="space-y-4">
            <FormField id="org-reg" label="N&deg; d&apos;immatriculation (NINEA, SIRET)" value={registrationNumber} onChange={setRegistrationNumber} disabled={submitting} />
            <div>
              <label htmlFor="org-sector" className="block text-[13px] font-medium text-gray-700">Secteur d&apos;activit&eacute;</label>
              <select id="org-sector" value={sector} onChange={(e) => setSector(e.target.value)} disabled={submitting} className={selectClass}>
                <option value="">S&eacute;lectionner</option>
                {SECTEURS_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
              </select>
            </div>
            <FormField id="org-desc" label="Description" value={description} onChange={setDescription} multiline disabled={submitting} placeholder="Pr&eacute;sentation de l&apos;organisation..." />
          </div>
        </SplitFormSection>
      </SplitForm>
    </div>
  )
}
