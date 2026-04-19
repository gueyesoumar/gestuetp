import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCreateCabinetClient } from '../features/clients/useCreateCabinetClient'
import { ClientIdentitySection } from '../features/clients/ClientIdentitySection'
import { ClientInfoSection } from '../features/clients/ClientInfoSection'
import { PartiesInteresseesSection } from '../features/clients/PartiesInteresseesSection'
import { ExigencesSection } from '../features/clients/ExigencesSection'
import { FormWizard } from '../components/ui/FormWizard'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import type { PartieInteressee, ExigenceReglementaire } from '../types/database.types'

export function ClientCreatePage() {
  const navigate = useNavigate()
  const { createClient, creating, error } = useCreateCabinetClient(() => navigate('/clients'))

  const [clientName, setClientName] = useState('')
  const [emailDomain, setEmailDomain] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [sector, setSector] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('S\u00e9n\u00e9gal')
  const [website, setWebsite] = useState('')
  const [phone, setPhone] = useState('')
  const [effectifs, setEffectifs] = useState('')
  const [ca, setCa] = useState('')
  const [sites, setSites] = useState('')
  const [activites, setActivites] = useState('')
  const [structure, setStructure] = useState('')
  const [parties, setParties] = useState<PartieInteressee[]>([])
  const [exigences, setExigences] = useState<ExigenceReglementaire[]>([])

  const handleSubmit = async () => {
    await createClient({
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
      activites_principales: activites || null,
      structure_hierarchique: structure || null,
      parties_interessees: parties,
      exigences_reglementaires: exigences,
    })
  }

  return (
    <div>
      <Link to="/clients" className="text-[13px] text-forest-700 hover:text-forest-900">
        &larr; Retour aux clients
      </Link>

      <h2 className="mt-4 text-xl font-semibold text-gray-900">Nouveau client</h2>
      <p className="mt-1 text-[13px] text-gray-500">Enregistrez un client dans votre portefeuille.</p>

      {error && <div className="mt-4"><ErrorAlert message={error} /></div>}

      <div className="mt-6">
        <FormWizard
          submitLabel="Créer le client"
          submitting={creating}
          onSubmit={handleSubmit}
          steps={[
            {
              key: 'identity',
              label: 'Identit\u00e9',
              content: (
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Identit&eacute; du client</h3>
                  <p className="text-[13px] text-gray-500 mt-1">Nom, coordonn&eacute;es et immatriculation</p>
                  <div className="mt-5">
                    <ClientIdentitySection
                      clientName={clientName} emailDomain={emailDomain} registrationNumber={registrationNumber}
                      sector={sector} address={address} city={city} country={country} website={website} phone={phone}
                      disabled={creating}
                      onClientName={setClientName} onEmailDomain={setEmailDomain} onRegistrationNumber={setRegistrationNumber}
                      onSector={setSector} onAddress={setAddress} onCity={setCity} onCountry={setCountry}
                      onWebsite={setWebsite} onPhone={setPhone}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'info',
              label: 'Informations',
              content: (
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Informations g&eacute;n&eacute;rales</h3>
                  <p className="text-[13px] text-gray-500 mt-1">Effectifs, chiffre d&apos;affaires, activit&eacute;s</p>
                  <div className="mt-5">
                    <ClientInfoSection
                      effectifs={effectifs} chiffreAffaires={ca} nombreSites={sites}
                      activitesPrincipales={activites} structureHierarchique={structure}
                      disabled={creating}
                      onEffectifs={setEffectifs} onChiffreAffaires={setCa} onNombreSites={setSites}
                      onActivitesPrincipales={setActivites} onStructureHierarchique={setStructure}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'parties',
              label: 'Parties int\u00e9ress\u00e9es',
              content: (
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Parties int&eacute;ress&eacute;es</h3>
                  <p className="text-[13px] text-gray-500 mt-1">Acteurs internes et externes concern&eacute;s</p>
                  <div className="mt-5">
                    <PartiesInteresseesSection parties={parties} disabled={creating} onChange={setParties} />
                  </div>
                </div>
              ),
            },
            {
              key: 'exigences',
              label: 'Exigences',
              content: (
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Exigences r&eacute;glementaires</h3>
                  <p className="text-[13px] text-gray-500 mt-1">Cadre l&eacute;gal et normatif applicable</p>
                  <div className="mt-5">
                    <ExigencesSection exigences={exigences} disabled={creating} onChange={setExigences} />
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
