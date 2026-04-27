import { useOrganization } from '../organization/useOrganization'
import { useUpdateOrganization } from '../organization/useUpdateOrganization'
import { OrganizationForm } from '../organization/OrganizationForm'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'

export function OrganizationInfoTab(): JSX.Element {
  const { organization, loading, error, refetch } = useOrganization()
  const { updateOrganization, updating, error: updateError } = useUpdateOrganization(refetch)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />
  if (!organization) return <ErrorAlert message="Organisation introuvable." />

  return (
    <div>
      <p className="mb-5 text-sm text-gray-600">
        G&eacute;rez les informations de votre organisation.
      </p>
      <OrganizationForm
        organization={organization}
        onSubmit={(data) => updateOrganization(organization.id, data)}
        submitting={updating}
        error={updateError}
      />
    </div>
  )
}
