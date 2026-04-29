import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Organization, OrganizationUpdate } from '../../types/database.types'
import { SplitForm } from '../../components/ui/SplitForm'
import { SplitFormSection } from '../../components/ui/SplitFormSection'
import { FormField } from '../../components/ui/FormField'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { SECTEURS_OPTIONS, PAYS_OPTIONS } from '../../lib/constants'
import { getOrgTypeLabel } from '../../lib/organization-utils'

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
  const [phone, setPhone] = useState(organization.phone ?? '')
  const [address, setAddress] = useState(organization.address ?? '')
  const [city, setCity] = useState(organization.city ?? '')
  const [country, setCountry] = useState(organization.country ?? '')
  const [registrationNumber, setRegistrationNumber] = useState(organization.registration_number ?? '')
  const [sector, setSector] = useState(organization.sector ?? '')
  const [description, setDescription] = useState(organization.description ?? '')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSuccess(false)
    // types est volontairement omis du payload : la modification est
    // réservée au super-admin Gëstu via l'edge function admin-update-organization.
    // Toute tentative côté user serait rejetée par le trigger 00095.
    const ok = await onSubmit({
      name, slug, website: website || null,
      phone: phone || null, address: address || null, city: city || null,
      country: country || null, registration_number: registrationNumber || null,
      sector: sector || null, description: description || null,
    })
    if (ok) setSuccess(true)
  }

  return (
    <div>
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
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-forest-100 text-forest-700 text-[12px] font-semibold">
                  {getOrgTypeLabel(organization)}
                </span>
                <span className="text-[11px] text-gray-400">
                  Ce param&egrave;tre est g&eacute;r&eacute; par l&apos;&eacute;quipe G&euml;stu.
                </span>
              </div>
            </div>
          </div>
        </SplitFormSection>

        <SplitFormSection title="Coordonn&eacute;es" description="Adresse et informations de contact">
          <div className="space-y-4">
            <FormField id="org-phone" label="T&eacute;l&eacute;phone" type="tel" value={phone} onChange={setPhone} disabled={submitting} />
            <FormField id="org-address" label="Adresse" value={address} onChange={setAddress} disabled={submitting} />
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="org-city" className="block text-[13px] font-medium text-gray-700 mb-1">Ville</label>
                <input id="org-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} disabled={submitting}
                  className="block w-full h-[38px] rounded-lg border border-gray-200 px-3 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 disabled:bg-gray-50" />
              </div>
              <div className="flex-1">
                <label htmlFor="org-country" className="block text-[13px] font-medium text-gray-700 mb-1">Pays</label>
                <select id="org-country" value={country} onChange={(e) => setCountry(e.target.value)} disabled={submitting}
                  className="block w-full h-[38px] rounded-lg border border-gray-200 px-3 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 disabled:bg-gray-50">
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
