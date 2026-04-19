import { useState } from 'react'
import type { FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCabinetClientDetail } from '../features/clients/useCabinetClientDetail'
import { useUpdateCabinetClient } from '../features/clients/useUpdateCabinetClient'
import { ClientIdentitySection } from '../features/clients/ClientIdentitySection'
import { ClientInfoSection } from '../features/clients/ClientInfoSection'
import { PartiesInteresseesSection } from '../features/clients/PartiesInteresseesSection'
import { ExigencesSection } from '../features/clients/ExigencesSection'
import { SplitForm } from '../components/ui/SplitForm'
import { SplitFormSection } from '../components/ui/SplitFormSection'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import type { PartieInteressee, ExigenceReglementaire } from '../types/database.types'

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
  const [activites, setActivites] = useState('')
  const [structure, setStructure] = useState('')
  const [parties, setParties] = useState<PartieInteressee[]>([])
  const [exigences, setExigences] = useState<ExigenceReglementaire[]>([])
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
    setActivites(client.activites_principales ?? '')
    setStructure(client.structure_hierarchique ?? '')
    setParties(client.parties_interessees ?? [])
    setExigences(client.exigences_reglementaires ?? [])
    setNotes(client.notes ?? '')
    setInitialized(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSuccess(false)
    const ok = await updateClient(client.id, {
      client_name: clientName, client_email_domain: emailDomain || null,
      client_registration_number: registrationNumber || null, client_sector: sector || null,
      client_address: address || null, client_city: city || null, client_country: country || null,
      client_website: website || null, client_phone: phone || null, effectifs: effectifs || null,
      chiffre_affaires: ca || null, nombre_sites: sites ? parseInt(sites, 10) : null,
      activites_principales: activites || null, structure_hierarchique: structure || null,
      parties_interessees: parties, exigences_reglementaires: exigences, notes: notes || null,
    })
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

      <div className="mt-6 max-w-3xl">
        <SplitForm onSubmit={handleSubmit} submitting={updating}>
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

          <SplitFormSection title="Informations" description="Effectifs, CA, activit&eacute;s et structure">
            <ClientInfoSection
              effectifs={effectifs} chiffreAffaires={ca} nombreSites={sites}
              activitesPrincipales={activites} structureHierarchique={structure}
              disabled={updating}
              onEffectifs={setEffectifs} onChiffreAffaires={setCa} onNombreSites={setSites}
              onActivitesPrincipales={setActivites} onStructureHierarchique={setStructure}
            />
          </SplitFormSection>

          <SplitFormSection title="Parties int&eacute;ress&eacute;es" description="Acteurs internes et externes">
            <PartiesInteresseesSection parties={parties} disabled={updating} onChange={setParties} />
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
