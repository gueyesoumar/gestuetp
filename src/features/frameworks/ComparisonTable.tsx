import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import type { MappingRow } from './useFrameworkComparison'
import type { ControlMappingRelationship } from '../../types/database.types'

interface ComparisonTableProps {
  mappings: MappingRow[]
  sourceFrameworkName: string
  targetFrameworkName: string
}

const relationshipLabels: Record<ControlMappingRelationship, { label: string; variant: 'green' | 'blue' | 'gray' }> = {
  equivalent: { label: '\u00c9quivalent', variant: 'green' },
  partial: { label: 'Partiel', variant: 'blue' },
  related: { label: 'Li\u00e9', variant: 'gray' },
}

export function ComparisonTable({ mappings, sourceFrameworkName, targetFrameworkName }: ComparisonTableProps) {
  if (mappings.length === 0) {
    return (
      <EmptyState
        title="Aucune correspondance"
        description="Aucune correspondance n&apos;a &eacute;t&eacute; d&eacute;finie entre ces deux r&eacute;f&eacute;rentiels."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">{sourceFrameworkName}</th>
            <th className="px-4 py-3">Relation</th>
            <th className="px-4 py-3">{targetFrameworkName}</th>
            <th className="px-4 py-3">Notes</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((row) => {
            const rel = relationshipLabels[row.relationship]
            return (
              <tr key={`${row.sourceControl.id}-${row.targetControl.id}`} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <span className="text-sm font-mono text-forest-700">{row.sourceControl.code}</span>
                  <span className="ml-2 text-sm text-gray-900">{row.sourceControl.name}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge label={rel.label} variant={rel.variant} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-mono text-forest-700">{row.targetControl.code}</span>
                  <span className="ml-2 text-sm text-gray-900">{row.targetControl.name}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{row.notes}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
