import { Link } from 'react-router-dom'
import { useCabinetClients } from '../features/clients/useCabinetClients'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { EmptyState } from '../components/ui/EmptyState'

export function ClientsListPage() {
  const { clients, loading, error } = useCabinetClients()

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Clients</h2>
          <p className="mt-1 text-sm text-gray-600">
            G&eacute;rez votre portefeuille de clients.
          </p>
        </div>
        <Link
          to="/clients/nouveau"
          className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-forest-900"
        >
          Nouveau client
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Aucun client"
            description="Enregistrez votre premier client."
            action={
              <Link
                to="/clients/nouveau"
                className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-forest-900"
              >
                Nouveau client
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link
              key={client.id}
              to={`/clients/${client.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <h3 className="text-base font-semibold text-gray-900">{client.client_name}</h3>
              {client.client_sector && (
                <p className="text-xs text-gray-500">{client.client_sector}</p>
              )}
              {client.activites_principales && (
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{client.activites_principales}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {client.effectifs && <Badge label={client.effectifs} variant="gray" />}
                {client.nombre_sites && <Badge label={`${client.nombre_sites} sites`} variant="gray" />}
                <Badge label={`${client.parties_interessees.length} PI`} variant="blue" />
                <Badge label={`${client.exigences_reglementaires.length} exigences`} variant="blue" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
