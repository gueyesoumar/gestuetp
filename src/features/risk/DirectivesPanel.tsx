import { Link } from 'react-router-dom'
import type { SupervisorDirective } from './useSupervisorDirectives'

const today = (): string => new Date().toISOString().slice(0, 10)

/** Panneau Directives : synthèse des demandes de traitement émises (en retard / en attente / à vérifier). */
export function DirectivesPanel({ rows }: { rows: SupervisorDirective[] }): JSX.Element {
  const t = today()
  const pending = rows.filter((d) => d.verification_status === 'pending')
  const late = pending.filter((d) => d.due_date && d.due_date < t)
  const awaiting = pending.filter((d) => !d.client_response)
  const toVerify = pending.filter((d) => d.client_response)
  const closed = rows.filter((d) => d.verification_status !== 'pending')

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900">Directives</h3>
        <Link to="/risque/plan" className="text-[12px] font-semibold text-forest-700 hover:underline">Suivi</Link>
      </div>
      <div className="divide-y divide-gray-100">
        <Row dot="#C0392B" a={`${late.length} en retard`} b="échéance dépassée" r="Agir" rc="text-red-600" />
        <Row dot="#B8860B" a={`${awaiting.length} en attente`} b="réponse de l'assujetti attendue" r="Suivi" rc="text-amber-600" />
        <Row dot="#D4A843" a={`${toVerify.length} à vérifier`} b="réponse reçue, à valider" r="Vérifier" rc="text-[#9C7A1F]" />
        <Row dot="#27AE60" a={`${closed.length} clôturées`} b="traitées" r="" rc="text-gray-400" />
      </div>
    </div>
  )
}

function Row({ dot, a, b, r, rc }: { dot: string; a: string; b: string; r: string; rc: string }): JSX.Element {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold text-gray-900">{a}</div>
        <div className="text-[11px] text-gray-500">{b}</div>
      </div>
      {r && <span className={`text-[11px] font-bold ${rc}`}>{r}</span>}
    </div>
  )
}
