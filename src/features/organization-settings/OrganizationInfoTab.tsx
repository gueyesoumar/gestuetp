import { useOrganization } from '../organization/useOrganization'
import { useUpdateOrganization } from '../organization/useUpdateOrganization'
import { OrganizationForm } from '../organization/OrganizationForm'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useCabinetPermissions } from '../../hooks/useCabinetPermissions'

export function OrganizationInfoTab(): JSX.Element {
  const { organization, loading, error, refetch } = useOrganization()
  const { updateOrganization, updating, error: updateError } = useUpdateOrganization(refetch)
  const { canEditOrganization, loading: permsLoading } = useCabinetPermissions()

  if (loading || permsLoading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />
  if (!organization) return <ErrorAlert message="Organisation introuvable." />

  return (
    <div>
      <p className="mb-5 text-sm text-gray-600">
        G&eacute;rez les informations de votre organisation.
      </p>
      {!canEditOrganization && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
          Vous consultez ces informations en lecture seule. La permission <strong>can_edit_organization</strong> est requise pour les modifier.
        </div>
      )}
      <OrganizationForm
        organization={organization}
        onSubmit={(data) => updateOrganization(organization.id, data)}
        submitting={updating || !canEditOrganization}
        error={updateError}
      />
    </div>
  )
}
