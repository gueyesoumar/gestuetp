import { useMemo } from 'react'
import { UsersRound, X, Building2, Layers } from 'lucide-react'
import { useVocab } from '../edition/useVocab'
import { useCabinetPermissions } from '../../hooks/useCabinetPermissions'
import { useMembers } from '../members/useMembers'
import { useSupervisedPortfolio } from './useSupervisedPortfolio'
import { useSupervisionAssignments, type SupervisionAssignment } from './useSupervisionAssignments'
import { SupervisionAssignmentForm } from './SupervisionAssignmentForm'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { EmptyState } from '../../components/ui/EmptyState'

/** Régulateur : confier le suivi de secteurs / assujettis à des membres de l'organisation. */
export function SupervisionAssignmentsPage(): JSX.Element {
  const vocab = useVocab()
  const { canManageSupervisionAssignments, loading: permLoading } = useCabinetPermissions()
  const { members, loading: mLoading } = useMembers()
  const { orgs, loading: oLoading } = useSupervisedPortfolio()
  const { assignments, loading: aLoading, error, add, remove } = useSupervisionAssignments()

  const sectors = useMemo(
    () => [...new Set(orgs.map((o) => o.sector).filter((s): s is string => !!s))].sort(),
    [orgs],
  )
  const staff = useMemo(() => members.filter((m) => m.is_active), [members])
  const byMember = useMemo(() => {
    const map = new Map<string, { name: string; items: SupervisionAssignment[] }>()
    for (const a of assignments) {
      const e = map.get(a.assignee_user_id) ?? { name: a.assignee_name || a.assignee_email, items: [] }
      e.items.push(a)
      map.set(a.assignee_user_id, e)
    }
    return [...map.values()].sort((x, y) => x.name.localeCompare(y.name))
  }, [assignments])

  if (permLoading) return <LoadingSpinner />
  if (!canManageSupervisionAssignments) {
    return <EmptyState title="Accès réservé" description="Seuls les responsables peuvent gérer les affectations de supervision." />
  }
  if (mLoading || oLoading || aLoading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <UsersRound size={20} className="text-[#E07A5F]" /> Affectations de supervision
        </h1>
        <p className="mt-1 text-[13px] text-gray-500">
          Confiez le suivi d&rsquo;un {vocab.entitySingular} précis ou d&rsquo;un secteur entier à un membre.
          Une affectation par secteur couvre aussi les futurs {vocab.entityPlural} de ce secteur.
          Un membre sans affectation ne voit aucun {vocab.entitySingular}.
        </p>
      </div>

      <SupervisionAssignmentForm members={staff} orgs={orgs} sectors={sectors} onAdd={add} />

      {byMember.length === 0 ? (
        <EmptyState title="Aucune affectation" description="Commencez par affecter un secteur ou un assujetti à un membre ci-dessus." />
      ) : (
        <div className="space-y-3">
          {byMember.map((m) => (
            <div key={m.name} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-bold text-gray-900 mb-2">{m.name}</p>
              <div className="flex flex-wrap gap-2">
                {m.items.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 pl-2.5 pr-1 py-1 text-[12px] text-gray-700">
                    {a.scope_type === 'sector'
                      ? <Layers size={13} className="text-[#C08A1E]" />
                      : <Building2 size={13} className="text-gray-400" />}
                    {a.scope_label}
                    <button
                      onClick={() => remove(a.id)}
                      className="ml-0.5 rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                      title="Retirer l'affectation"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
