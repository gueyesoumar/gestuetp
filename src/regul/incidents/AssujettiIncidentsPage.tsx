import { useState } from 'react'
import { Plus, AlertTriangle } from 'lucide-react'
import { useIncidents, type Incident } from './useIncidents'
import { IncidentDeclareModal } from './IncidentDeclareModal'
import { IncidentDetailPanel } from './IncidentDetailPanel'
import { useAuth } from '../../hooks/useAuth'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { INCIDENT_CATEGORY_LABELS, INCIDENT_SEVERITY_LABELS, INCIDENT_STATUS_LABELS } from '../../lib/constants'

const SEV_TONE: Record<string, string> = {
  critique: 'bg-red-100 text-red-700', eleve: 'bg-orange-100 text-orange-700',
  moyen: 'bg-amber-100 text-amber-700', faible: 'bg-gray-100 text-gray-600',
}

function late(inc: Incident): boolean {
  const now = new Date()
  return (!inc.notified_initial_at && !!inc.initial_deadline && new Date(inc.initial_deadline) < now)
    || (!inc.final_report_at && !!inc.final_deadline && new Date(inc.final_deadline) < now)
}

/** M5(2) — self-déclaration et suivi des incidents par l'assujetti (portail cloisonné). */
export function AssujettiIncidentsPage(): JSX.Element {
  const { profile } = useAuth()
  const { incidents, loading, refresh } = useIncidents()
  const [declaring, setDeclaring] = useState(false)
  const [selected, setSelected] = useState<Incident | null>(null)

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Incidents</h1>
          <p className="mt-1 text-[13px] text-gray-500">Déclarez et suivez vos incidents cyber auprès du régulateur.</p>
        </div>
        <button onClick={() => setDeclaring(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-forest-700 text-white rounded-lg text-xs font-semibold hover:bg-forest-900 shrink-0">
          <Plus size={15} /> Déclarer un incident
        </button>
      </div>

      {incidents.length === 0 ? (
        <EmptyState title="Aucun incident" description="Vous n&apos;avez déclaré aucun incident cyber." />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 font-semibold">Incident</th>
                <th className="px-4 py-3 font-semibold">Catégorie</th>
                <th className="px-4 py-3 font-semibold">Gravité</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Échéance</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr key={inc.id} onClick={() => setSelected(inc)} className="border-b border-gray-50 last:border-0 hover:bg-forest-50/40 cursor-pointer">
                  <td className="px-4 py-3 font-semibold text-gray-900">{inc.title}</td>
                  <td className="px-4 py-3 text-gray-600">{INCIDENT_CATEGORY_LABELS[inc.category] ?? inc.category}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${SEV_TONE[inc.severity] ?? 'bg-gray-100 text-gray-500'}`}>{INCIDENT_SEVERITY_LABELS[inc.severity as keyof typeof INCIDENT_SEVERITY_LABELS] ?? inc.severity}</span></td>
                  <td className="px-4 py-3 text-gray-600">{INCIDENT_STATUS_LABELS[inc.status as keyof typeof INCIDENT_STATUS_LABELS] ?? inc.status}</td>
                  <td className="px-4 py-3">
                    {late(inc)
                      ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600"><AlertTriangle size={13} /> En retard</span>
                      : <span className="text-[11px] text-gray-400">Dans les délais</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {declaring && profile && (
        <IncidentDeclareModal fixedEntity={{ id: profile.organization_id }} onClose={() => setDeclaring(false)} onSuccess={refresh} />
      )}
      {selected && (
        <IncidentDetailPanel incident={selected} entityName="Votre organisation" readOnly onClose={() => setSelected(null)} onChanged={() => { refresh(); setSelected(null) }} />
      )}
    </div>
  )
}
