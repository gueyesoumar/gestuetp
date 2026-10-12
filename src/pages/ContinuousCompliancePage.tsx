import { useContinuousCompliance } from '../features/continuous-compliance/useContinuousCompliance'
import { TenableConnectCard } from '../features/continuous-compliance/TenableConnectCard'
import { ContinuousAlertSummary } from '../features/continuous-compliance/ContinuousAlertSummary'
import { EvidenceList } from '../features/continuous-compliance/EvidenceList'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'

/** Module Conformité continue (RFC 0014) : connecteurs de preuve + preuves collectées. */
export function ContinuousCompliancePage(): JSX.Element {
  const { integration, checks, loading, error, refetch } = useContinuousCompliance()

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold text-gray-900">Conformité continue</h2>
      <p className="mt-1 text-[13px] text-gray-500">
        Collectez automatiquement la preuve de conformité depuis vos outils — vérifiée, horodatée et versée dans la piste d&apos;audit.
      </p>

      {error && <div className="mt-4"><ErrorAlert message={error} /></div>}

      <div className="mt-6 space-y-5">
        <TenableConnectCard integration={integration} onChanged={refetch} />
        {integration?.status === 'active' && (
          <>
            <ContinuousAlertSummary checks={checks} />
            <EvidenceList checks={checks} />
          </>
        )}
      </div>
    </div>
  )
}
