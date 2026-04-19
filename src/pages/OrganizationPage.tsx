import { useOrganization } from '../features/organization/useOrganization'
import { useUpdateOrganization } from '../features/organization/useUpdateOrganization'
import { OrganizationForm } from '../features/organization/OrganizationForm'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'

export function OrganizationPage() {
  const { organization, loading, error, refetch } = useOrganization()
  const { updateOrganization, updating, error: updateError } = useUpdateOrganization(refetch)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />
  if (!organization) return <ErrorAlert message="Organisation introuvable." />

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Organisation</h2>
      <p className="mt-1 text-sm text-gray-600">
        G&eacute;rez les informations de votre organisation.
      </p>
      <div className="mt-6">
        <OrganizationForm
          organization={organization}
          onSubmit={(data) => updateOrganization(organization.id, data)}
          submitting={updating}
          error={updateError}
        />
      </div>
    </div>
  )
}
