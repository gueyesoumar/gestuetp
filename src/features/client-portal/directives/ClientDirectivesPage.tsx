import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useClientDirectives, type ClientDirective } from './useClientDirectives'
import { DirectiveRespondDialog } from './DirectiveRespondDialog'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { EmptyState } from '../../../components/ui/EmptyState'

const STATUS: Record<string, string> = { todo: 'À faire', in_progress: 'En cours', done: 'Traité', cancelled: 'Annulé' }
const VERIF: Record<string, { label: string; cls: string }> = {
  pending: { label: 'En attente de vérification', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  verified: { label: 'Vérifiée', cls: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { label: 'À reprendre', cls: 'bg-red-50 text-red-700 border-red-200' },
}

/** Portail assujetti : directives de traitement du régulateur, avec réponse et preuves. */
export function ClientDirectivesPage(): JSX.Element {
  const d = useClientDirectives()
  const [active, setActive] = useState<ClientDirective | null>(null)

  if (d.loading) return <LoadingSpinner />
  if (d.error) return <ErrorAlert message={d.error} />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><ShieldAlert size={20} className="text-forest-700" /> Directives du régulateur</h1>
        <p className="mt-1 text-[13px] text-gray-500">Actions de traitement demandées par votre autorité de supervision. Répondez, joignez une preuve, et suivez la vérification.</p>
      </div>

      {d.directives.length === 0 ? (
        <EmptyState title="Aucune directive" description="Aucune action de traitement ne vous a été demandée pour l'instant." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Directive</th>
                <th className="text-left px-4 py-3 font-semibold">Échéance</th>
                <th className="text-left px-4 py-3 font-semibold">Statut</th>
                <th className="text-left px-4 py-3 font-semibold">Vérification</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {d.directives.map((row) => {
                const v = VERIF[row.verification_status] ?? VERIF.pending
                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">
                      <p className="font-medium text-gray-900">{row.description}</p>
                      {row.client_response && <p className="mt-0.5 text-[12px] text-gray-500">Votre réponse : {row.client_response}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{row.due_date ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{STATUS[row.status] ?? row.status}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${v.cls}`}>{v.label}</span></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setActive(row)} className="text-[13px] font-medium text-forest-700 hover:underline">
                        {row.verification_status === 'verified' ? 'Voir' : 'Répondre'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {active && (
        <DirectiveRespondDialog
          directive={active}
          onClose={() => setActive(null)}
          respond={d.respond}
          listEvidence={d.listEvidence}
          uploadEvidence={d.uploadEvidence}
          signedUrl={d.signedUrl}
          onDone={d.refetch}
        />
      )}
    </div>
  )
}
