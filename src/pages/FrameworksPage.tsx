import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useFrameworks } from '../features/frameworks/useFrameworks'
import { FrameworkCard } from '../features/frameworks/FrameworkCard'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { EmptyState } from '../components/ui/EmptyState'
import type { FrameworkCategory } from '../types/database.types'

type FilterKey = 'all' | FrameworkCategory

const categories: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'conformite', label: 'Conformit\u00e9 & S\u00e9curit\u00e9' },
  { key: 'gouvernance', label: 'Gouvernance & Management' },
  { key: 'evaluation', label: '\u00c9valuation & Investissement' },
]

const categoryLabels: Record<FrameworkCategory, string> = {
  conformite: 'Conformit\u00e9 & S\u00e9curit\u00e9 SI',
  gouvernance: 'Gouvernance & Management SI',
  evaluation: '\u00c9valuation & Investissement',
}

const categoryOrder: FrameworkCategory[] = ['conformite', 'gouvernance', 'evaluation']

export function FrameworksPage() {
  const { frameworks, loading, error } = useFrameworks()
  const [filter, setFilter] = useState<FilterKey>('all')

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = { all: frameworks.length }
    for (const fw of frameworks) {
      counts[fw.category] = (counts[fw.category] ?? 0) + 1
    }
    return counts
  }, [frameworks])

  const grouped = useMemo(() => {
    const filtered = filter === 'all' ? frameworks : frameworks.filter((fw) => fw.category === filter)
    const groups = new Map<FrameworkCategory, typeof frameworks>()
    for (const cat of categoryOrder) {
      const fws = filtered.filter((fw) => fw.category === cat)
      if (fws.length > 0) groups.set(cat, fws)
    }
    return groups
  }, [frameworks, filter])

  const gestuCount = frameworks.filter((fw) => fw.publisher === 'G\u00ebstu').length
  const totalControls = 356 // precomputed

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  if (frameworks.length === 0) {
    return (
      <EmptyState
        title="Aucun r\u00e9f\u00e9rentiel disponible"
        description="Les r\u00e9f\u00e9rentiels sont g\u00e9r\u00e9s par G\u00ebstu."
      />
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">R&eacute;f&eacute;rentiels</h2>
          <p className="mt-1 text-[13px] text-gray-500">
            R&eacute;f&eacute;rentiels de conformit&eacute;, d&apos;audit et d&apos;&eacute;valuation disponibles sur la plateforme.
          </p>
        </div>
        {frameworks.length >= 2 && (
          <Link
            to="/referentiels/comparer"
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-forest-50 hover:border-forest-300 transition-colors"
          >
            Comparer les r&eacute;f&eacute;rentiels
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="mt-4 flex gap-3">
        <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[12px] text-gray-500">
          <span className="font-bold text-gray-900">{frameworks.length}</span> r&eacute;f&eacute;rentiels
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[12px] text-gray-500">
          <span className="font-bold text-gray-900">{totalControls}</span> contr&ocirc;les
        </div>
        {gestuCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-gold-200 bg-gold-50 px-3.5 py-2 text-[12px] text-gold-600">
            <span className="font-bold">{gestuCount}</span> r&eacute;f&eacute;rentiels G&euml;stu
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="mt-4 mb-5">
        <div className="inline-flex bg-white border border-gray-200 rounded-[10px] p-[3px]">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors ${
                filter === cat.key
                  ? 'bg-forest-700 text-white font-semibold'
                  : 'text-gray-500 hover:text-forest-700'
              }`}
            >
              {cat.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                filter === cat.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {countByCategory[cat.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grouped cards */}
      <div className="space-y-10">
        {Array.from(grouped.entries()).map(([category, fws]) => (
          <div key={category}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-300">
                {categoryLabels[category]}
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fws.map((fw) => (
                <FrameworkCard key={fw.id} framework={fw} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Compare link */}
      {frameworks.length >= 2 && (
        <Link
          to="/referentiels/comparer"
          className="inline-flex items-center gap-2 mt-6 px-4 py-2.5 rounded-lg border border-dashed border-gray-300 text-[13px] text-gray-500 hover:border-forest-300 hover:text-forest-700 hover:bg-forest-50 transition-colors"
        >
          Comparer les r&eacute;f&eacute;rentiels entre eux
        </Link>
      )}
    </div>
  )
}
