import { useState } from 'react'
import { useDeclareIncident, type Incident } from './useIncidents'
import { INCIDENT_CATEGORY_LABELS, INCIDENT_SEVERITY_LABELS, INCIDENT_STATUS_LABELS } from '../../lib/constants'

interface Props { incident: Incident; entityName: string; onClose: () => void; onChanged: () => void; readOnly?: boolean }

function fmt(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
}

function DeadlineChip({ deadline, done, label }: { deadline: string | null; done: string | null; label: string }): JSX.Element {
  if (!deadline) return <span className="text-[11px] text-gray-400">{label} : n/a</span>
  const late = !done && new Date(deadline) < new Date()
  const tone = done ? 'bg-green-50 text-green-700' : late ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
  const txt = done ? `fait le ${fmt(done)}` : late ? `en retard (${fmt(deadline)})` : `échéance ${fmt(deadline)}`
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${tone}`}>{label} : {txt}</span>
}

/** Détail d'un incident + actes de triage/notification (M5-1, régulateur). */
export function IncidentDetailPanel({ incident, entityName, onClose, onChanged, readOnly = false }: Props): JSX.Element {
  const { setStatus, notify, busy } = useDeclareIncident()
  const [err, setErr] = useState<string | null>(null)

  const act = async (fn: () => Promise<{ ok: boolean; error?: string }>): Promise<void> => {
    setErr(null)
    const r = await fn()
    if (!r.ok) { setErr(r.error ?? 'Erreur'); return }
    onChanged()
  }

  const btn = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">{entityName}</p>
          <h3 className="text-base font-bold">{incident.title}</h3>
          <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-forest-50 text-forest-700 font-semibold">{INCIDENT_CATEGORY_LABELS[incident.category] ?? incident.category}</span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">Gravité : {INCIDENT_SEVERITY_LABELS[incident.severity as keyof typeof INCIDENT_SEVERITY_LABELS] ?? incident.severity}</span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">{INCIDENT_STATUS_LABELS[incident.status as keyof typeof INCIDENT_STATUS_LABELS] ?? incident.status}</span>
          </div>
        </div>

        <div className="p-5 space-y-3 text-[13px]">
          {err && <p className="text-xs text-red-600">{err}</p>}
          <p className="text-gray-700">{incident.description || <span className="text-gray-400">Sans description.</span>}</p>
          {incident.affected_systems && <p><span className="text-gray-400">Systèmes affectés : </span>{incident.affected_systems}</p>}
          <div className="grid grid-cols-2 gap-2 text-[12px] text-gray-600">
            <p><span className="text-gray-400">Détecté : </span>{fmt(incident.detected_at)}</p>
            <p><span className="text-gray-400">Déclaré : </span>{fmt(incident.declared_at)}</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <DeadlineChip deadline={incident.initial_deadline} done={incident.notified_initial_at} label="Notif. initiale" />
            <DeadlineChip deadline={incident.final_deadline} done={incident.final_report_at} label="Rapport final" />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 space-y-2">
          {!readOnly && (
            <>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Actes de régulation</p>
              <div className="flex flex-wrap gap-2">
                {incident.status === 'declared' && <button disabled={busy} onClick={() => act(() => setStatus(incident.id, 'triage'))} className={`${btn} bg-forest-50 text-forest-700 hover:bg-forest-100`}>Mettre en qualification</button>}
                {incident.status === 'triage' && !incident.notified_initial_at && <button disabled={busy} onClick={() => act(() => notify(incident.id, 'initial'))} className={`${btn} bg-forest-700 text-white hover:bg-forest-900`}>Notification initiale</button>}
                {incident.status !== 'declared' && !incident.final_report_at && <button disabled={busy} onClick={() => act(() => notify(incident.id, 'final'))} className={`${btn} bg-forest-50 text-forest-700 hover:bg-forest-100`}>Rapport final</button>}
                {(incident.status === 'triage' || incident.status === 'notified') && <button disabled={busy} onClick={() => act(() => setStatus(incident.id, 'resolved'))} className={`${btn} bg-green-50 text-green-700 hover:bg-green-100`}>Marquer résolu</button>}
                {incident.status === 'resolved' && <button disabled={busy} onClick={() => act(() => setStatus(incident.id, 'closed'))} className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`}>Clôturer</button>}
              </div>
            </>
          )}
          <button onClick={onClose} className="w-full mt-2 px-4 py-2 bg-gray-100 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-200">Fermer</button>
        </div>
      </div>
    </div>
  )
}
