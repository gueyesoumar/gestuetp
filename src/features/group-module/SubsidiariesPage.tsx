import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useSubsidiaries } from './useSubsidiaries'
import { SubsidiaryCard } from './SubsidiaryCard'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'

export function SubsidiariesPage(): JSX.Element {
  const { subsidiaries, loading, totalCount, averageScore, totalActiveMissions, totalOverdue } = useSubsidiaries()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return subsidiaries
    return subsidiaries.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.sector ?? '').toLowerCase().includes(q) ||
      (s.city ?? '').toLowerCase().includes(q)
    )
  }, [subsidiaries, search])

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Filiales</h2>
          <p className="mt-1 text-[13px] text-gray-500">
            {totalCount === 0
              ? 'Aucune filiale rattachée à votre groupe.'
              : `${totalCount} filiale${totalCount > 1 ? 's' : ''} ${
                  averageScore !== null ? `· score moyen ${averageScore}%` : ''
                } · ${totalActiveMissions} mission${totalActiveMissions !== 1 ? 's' : ''} active${totalActiveMissions !== 1 ? 's' : ''}${
                  totalOverdue > 0 ? ` · ${totalOverdue} plan${totalOverdue > 1 ? 's' : ''} en retard` : ''
                }`}
          </p>
        </div>
        {totalCount > 0 && (
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une filiale, un secteur, une ville…"
              className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg w-80 focus:border-forest-700 focus:ring-1 focus:ring-forest-700"
            />
          </div>
        )}
      </div>

      {totalCount === 0 ? (
        <EmptyState
          title="Aucune filiale"
          description="Pour activer la supervision groupe, créez vos filiales en les rattachant à votre organisation parente."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucun résultat"
          description="Aucune filiale ne correspond à votre recherche."
        />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((s) => <SubsidiaryCard key={s.id} subsidiary={s} />)}
        </div>
      )}
    </div>
  )
}
