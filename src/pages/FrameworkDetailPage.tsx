import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useFrameworkDetail } from '../features/frameworks/useFrameworkDetail'
import { DomainAccordion } from '../features/frameworks/DomainAccordion'
import { ControlDetailPanel } from '../features/frameworks/ControlDetailPanel'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { Badge } from '../components/ui/Badge'
import type { Control } from '../types/database.types'

interface SelectedControl {
  control: Control
  domainName: string
}

export function FrameworkDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { framework, domains, loading, error } = useFrameworkDetail(slug)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<SelectedControl | null>(null)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />
  if (!framework) return <ErrorAlert message="R&eacute;f&eacute;rentiel introuvable." />

  const totalControls = domains.reduce((sum, d) => sum + d.controls.length, 0)

  const filteredDomains = search.trim()
    ? domains.map((d) => ({
        ...d,
        controls: d.controls.filter(
          (c) =>
            c.code.toLowerCase().includes(search.toLowerCase()) ||
            c.name.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((d) =>
        d.controls.length > 0 ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.code.toLowerCase().includes(search.toLowerCase())
      )
    : domains

  return (
    <div>
      <Link to="/referentiels" className="text-sm text-forest-700 hover:text-forest-900">
        &larr; Retour aux r&eacute;f&eacute;rentiels
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{framework.name}</h2>
          {framework.description && (
            <p className="mt-1 text-sm text-gray-600">{framework.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {framework.version && <Badge label={`v${framework.version}`} variant="blue" />}
          <Badge label={`${totalControls} contr\u00f4les`} variant="gray" />
          <Badge label={`${domains.length} domaines`} variant="gray" />
        </div>
      </div>

      <div className="mt-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un contr&ocirc;le (code ou nom)..."
          className="w-full max-w-md rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
        />
      </div>

      <div className="mt-6 space-y-3">
        {filteredDomains.map((domain, idx) => (
          <DomainAccordion
            key={domain.id}
            domain={domain}
            defaultOpen={idx === 0 && !search}
            onSelectControl={(control, domainName) =>
              setSelected({ control, domainName })
            }
          />
        ))}
      </div>

      {selected && (
        <ControlDetailPanel
          control={selected.control}
          domainName={selected.domainName}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
