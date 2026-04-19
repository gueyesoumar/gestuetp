import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFrameworks } from '../features/frameworks/useFrameworks'
import { useFrameworkComparison } from '../features/frameworks/useFrameworkComparison'
import { ComparisonTable } from '../features/frameworks/ComparisonTable'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'

export function FrameworkComparisonPage() {
  const { frameworks, loading: fwLoading } = useFrameworks()
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null)
  const { mappings, loading, error } = useFrameworkComparison(sourceId, targetId)

  const sourceName = frameworks.find((f) => f.id === sourceId)?.name ?? ''
  const targetName = frameworks.find((f) => f.id === targetId)?.name ?? ''

  if (fwLoading) return <LoadingSpinner />

  return (
    <div>
      <Link to="/referentiels" className="text-sm text-forest-700 hover:text-forest-900">
        &larr; Retour aux r&eacute;f&eacute;rentiels
      </Link>

      <h2 className="mt-4 text-xl font-semibold text-gray-900">Comparaison de r&eacute;f&eacute;rentiels</h2>
      <p className="mt-1 text-sm text-gray-600">
        S&eacute;lectionnez deux r&eacute;f&eacute;rentiels pour voir les correspondances entre leurs contr&ocirc;les.
      </p>

      <div className="mt-6 flex gap-4">
        <div className="flex-1">
          <label htmlFor="source-fw" className="block text-sm font-medium text-gray-700">
            R&eacute;f&eacute;rentiel source
          </label>
          <select
            id="source-fw"
            value={sourceId ?? ''}
            onChange={(e) => setSourceId(e.target.value || null)}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
          >
            <option value="">S&eacute;lectionner...</option>
            {frameworks.map((fw) => (
              <option key={fw.id} value={fw.id} disabled={fw.id === targetId}>
                {fw.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end pb-2 text-gray-400">&harr;</div>

        <div className="flex-1">
          <label htmlFor="target-fw" className="block text-sm font-medium text-gray-700">
            R&eacute;f&eacute;rentiel cible
          </label>
          <select
            id="target-fw"
            value={targetId ?? ''}
            onChange={(e) => setTargetId(e.target.value || null)}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
          >
            <option value="">S&eacute;lectionner...</option>
            {frameworks.map((fw) => (
              <option key={fw.id} value={fw.id} disabled={fw.id === sourceId}>
                {fw.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8">
        {error && <ErrorAlert message={error} />}
        {loading && <LoadingSpinner message="Chargement des correspondances..." />}
        {!loading && sourceId && targetId && (
          <ComparisonTable
            mappings={mappings}
            sourceFrameworkName={sourceName}
            targetFrameworkName={targetName}
          />
        )}
      </div>
    </div>
  )
}
