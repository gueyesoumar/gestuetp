import { useState } from 'react'
import type { FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCabinetClientDetail } from '../features/clients/useCabinetClientDetail'
import { useUpdateCabinetClient } from '../features/clients/useUpdateCabinetClient'
import { ClientIdentitySection } from '../features/clients/ClientIdentitySection'
import { ClientInfoSection } from '../features/clients/ClientInfoSection'
import { ExigencesSection } from '../features/clients/ExigencesSection'
import { ClientBrandingSection } from '../features/clients/ClientBrandingSection'
import { SplitForm } from '../components/ui/SplitForm'
import { SplitFormSection } from '../components/ui/SplitFormSection'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import type { ExigenceReglementaire } from '../types/database.types'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { client, loading, error, refetch } = useCabinetClientDetail(id)
  const { updateClient, updating, error: updateError } = useUpdateCabinetClient(refetch)

  const [clientName, setClientName] = useState('')
  const [emailDomain, setEmailDomain] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [sector, setSector] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [website, setWebsite] = useState('')
  const [phone, setPhone] = useState('')
  const [effectifs, setEffectifs] = useState('')
  const [ca, setCa] = useState('')
  const [sites, setSites] = useState('')

  const [exigences, setExigences] = useState<ExigenceReglementaire[]>([])
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [brandPrimary, setBrandPrimary] = useState<string | null>(null)
  const [brandSecondary, setBrandSecondary] = useState<string | null>(null)
  const [brandAccent, setBrandAccent] = useState<string | null>(null)
  const [brandFont, setBrandFont] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [success, setSuccess] = useState(false)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />
  if (!client) return <ErrorAlert message="Client introuvable." />

  if (!initialized) {
    setClientName(client.client_name)
    setEmailDomain(client.client_email_domain ?? '')
    setRegistrationNumber(client.client_registration_number ?? '')
    setSector(client.client_sector ?? '')
    setAddress(client.client_address ?? '')
    setCity(client.client_city ?? '')
    setCountry(client.client_country ?? '')
    setWebsite(client.client_website ?? '')
    setPhone(client.client_phone ?? '')
    setEffectifs(client.effectifs ?? '')
    setCa(client.chiffre_affaires ?? '')
    setSites(client.nombre_sites?.toString() ?? '')
    setExigences(client.exigences_reglementaires ?? [])
    setLogoUrl(client.logo_url ?? null)
    setBrandPrimary(client.brand_primary_color ?? null)
    setBrandSecondary(client.brand_secondary_color ?? null)
    setBrandAccent(client.brand_accent_color ?? null)
    setBrandFont(client.brand_font ?? null)
    setNotes(client.notes ?? '')
    setInitialized(true)
  }

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    setSuccess(false)
    const payload: Record<string, unknown> = {
      client_name: clientName,
      client_email_domain: emailDomain || null,
      client_registration_number: registrationNumber || null,
      client_sector: sector || null,
      client_address: address || null,
      client_city: city || null,
      client_country: country || null,
      client_website: website || null,
      client_phone: phone || null,
      effectifs: effectifs || null,
      chiffre_affaires: ca || null,
      nombre_sites: sites ? parseInt(sites, 10) : null,
      exigences_reglementaires: exigences,
      logo_url: logoUrl,
      brand_primary_color: brandPrimary,
      brand_secondary_color: brandSecondary,
      brand_accent_color: brandAccent,
      brand_font: brandFont,
      notes: notes || null,
    }
    const ok = await updateClient(client.id, payload as Record<string, unknown> & import('../types/database.types').CabinetClientUpdate)
    if (ok) setSuccess(true)
  }

  return (
    <div>
      <Link to="/clients" className="text-[13px] text-forest-700 hover:text-forest-900">
        &larr; Retour aux clients
      </Link>

      <h2 className="mt-4 text-xl font-semibold text-gray-900">{client.client_name}</h2>
      <p className="mt-1 text-[13px] text-gray-500">Fiche client interne au cabinet.</p>

      {updateError && <div className="mt-4"><ErrorAlert message={updateError} /></div>}
      {success && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-[13px] text-green-700">
          Fiche client mise &agrave; jour.
        </div>
      )}

      <div className="mt-6">
        <SplitForm onSubmit={handleSubmit} submitting={updating} onSave={() => handleSubmit()}>
          <SplitFormSection title="Identit&eacute;" description="Nom, coordonn&eacute;es et immatriculation du client">
            <ClientIdentitySection
              clientName={clientName} emailDomain={emailDomain} registrationNumber={registrationNumber}
              sector={sector} address={address} city={city} country={country} website={website} phone={phone}
              disabled={updating}
              onClientName={setClientName} onEmailDomain={setEmailDomain} onRegistrationNumber={setRegistrationNumber}
              onSector={setSector} onAddress={setAddress} onCity={setCity} onCountry={setCountry}
              onWebsite={setWebsite} onPhone={setPhone}
            />
          </SplitFormSection>

          <SplitFormSection title="Informations" description="Effectifs, CA et sites">
            <ClientInfoSection
              effectifs={effectifs} chiffreAffaires={ca} nombreSites={sites}
              disabled={updating}
              onEffectifs={setEffectifs} onChiffreAffaires={setCa} onNombreSites={setSites}
            />
          </SplitFormSection>

          <SplitFormSection title="Identit&eacute; visuelle" description="Logo et charte graphique pour personnaliser les rapports">
            <ClientBrandingSection
              clientId={client.id}
              logoUrl={logoUrl}
              primaryColor={brandPrimary}
              secondaryColor={brandSecondary}
              accentColor={brandAccent}
              brandFont={brandFont}
              disabled={updating}
              onLogoUrl={setLogoUrl}
              onPrimaryColor={setBrandPrimary}
              onSecondaryColor={setBrandSecondary}
              onAccentColor={setBrandAccent}
              onBrandFont={setBrandFont}
            />
          </SplitFormSection>

          <SplitFormSection title="Exigences" description="Cadre l&eacute;gal et normatif">
            <ExigencesSection exigences={exigences} disabled={updating} onChange={setExigences} />
          </SplitFormSection>

          <SplitFormSection title="Notes internes" description="Observations du cabinet">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={updating}
              placeholder="Notes internes du cabinet..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
            />
          </SplitFormSection>
        </SplitForm>
      </div>
    </div>
  )
}
