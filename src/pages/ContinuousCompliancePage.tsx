import { useContinuousCompliance } from '../features/continuous-compliance/useContinuousCompliance'
import { CONNECTORS } from '../features/continuous-compliance/connectors'
import { ConnectorCard } from '../features/continuous-compliance/ConnectorCard'
import { ContinuousAlertSummary } from '../features/continuous-compliance/ContinuousAlertSummary'
import { EvidenceList } from '../features/continuous-compliance/EvidenceList'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'

/** Module Conformité continue (RFC 0014) : connecteurs de preuve + preuves collectées. */
export function ContinuousCompliancePage(): JSX.Element {
  const { integrations, checks, loading, error, refetch } = useContinuousCompliance()

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold text-gray-900">Conformité continue</h2>
      <p className="mt-1 text-[13px] text-gray-500">
        Collectez automatiquement la preuve de conformité depuis vos outils — vérifiée, horodatée et versée dans la piste d&apos;audit.
      </p>

      {error && <div className="mt-4"><ErrorAlert message={error} /></div>}

      <div className="mt-6 space-y-8">
        {CONNECTORS.map((descriptor) => {
          const integration = integrations.find((i) => i.provider === descriptor.provider) ?? null
          const providerChecks = checks.filter((c) => c.check.provider === descriptor.provider)
          return (
            <section key={descriptor.provider} className="space-y-4">
              <ConnectorCard descriptor={descriptor} integration={integration} onChanged={refetch} />
              {integration?.status === 'active' && (
                <>
                  <ContinuousAlertSummary checks={providerChecks} />
                  <EvidenceList checks={providerChecks} />
                </>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
