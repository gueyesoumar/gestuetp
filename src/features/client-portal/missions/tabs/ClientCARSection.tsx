import { useState } from 'react'
import { AlertTriangle, FileText, Calendar, Check, Clock } from 'lucide-react'
import { useClientCARs } from './useClientCARs'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Ouvert', color: 'text-gold-600 bg-gold-50' },
  client_responded: { label: 'R&eacute;pondu', color: 'text-blue-600 bg-blue-50' },
  verified: { label: 'V&eacute;rifi&eacute;', color: 'text-green-600 bg-green-50' },
  closed: { label: 'Cl&ocirc;tur&eacute;', color: 'text-gray-500 bg-gray-100' },
}

const CLASSIFICATION_CONFIG: Record<string, { label: string; color: string }> = {
  major_nc: { label: 'NC Majeure', color: 'text-red-600 bg-red-50' },
  minor_nc: { label: 'NC Mineure', color: 'text-orange-600 bg-orange-50' },
  observation: { label: 'Observation', color: 'text-blue-600 bg-blue-50' },
}

interface Props {
  missionId: string
  isContributor: boolean
}

export function ClientCARSection({ missionId, isContributor }: Props): JSX.Element {
  const { cars, loading, submitResponse, submitting } = useClientCARs(missionId)

  if (loading) return <p className="text-xs text-gray-400 text-center py-4">Chargement...</p>
  if (cars.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
        <p className="text-xs text-gray-400">Aucune demande d&rsquo;action corrective pour cette mission.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {cars.map((car) => (
        <CARCard key={car.id} car={car} isContributor={isContributor} onSubmit={submitResponse} submitting={submitting} />
      ))}
    </div>
  )
}

function CARCard({ car, isContributor, onSubmit, submitting }: {
  car: ReturnType<typeof useClientCARs>['cars'][0]
  isContributor: boolean
  onSubmit: (id: string, rootCause: string, action: string, targetDate: string) => Promise<boolean>
  submitting: boolean
}): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [rootCause, setRootCause] = useState(car.client_root_cause ?? '')
  const [action, setAction] = useState(car.client_action ?? '')
  const [targetDate, setTargetDate] = useState(car.client_target_date ?? '')

  const statusCfg = STATUS_CONFIG[car.status] ?? STATUS_CONFIG.open
  const classCfg = CLASSIFICATION_CONFIG[car.finding_classification] ?? { label: car.finding_classification, color: 'text-gray-500 bg-gray-50' }

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <button type="button" onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left">
        <AlertTriangle size={14} className="text-gold-600 shrink-0" />
        <span className="font-mono text-[11px] font-semibold text-forest-700">{car.code}</span>
        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${classCfg.color}`}>{classCfg.label}</span>
        {car.control_code && <span className="font-mono text-[9px] bg-forest-50 text-forest-700 px-1.5 py-0.5 rounded">{car.control_code}</span>}
        <span className="flex-1" />
        {car.deadline && (
          <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
            <Calendar size={10} />{new Date(car.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </span>
        )}
        <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${statusCfg.color}`}>{statusCfg.label}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3">
          <div className="flex items-start gap-1.5">
            <FileText size={12} className="text-gray-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-700 leading-relaxed">{car.description}</p>
          </div>

          {car.status === 'open' && isContributor ? (
            <div className="space-y-2 bg-gray-50 rounded-lg p-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Cause racine</label>
                <textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] outline-none focus:border-forest-500 resize-y" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Action corrective</label>
                <textarea value={action} onChange={(e) => setAction(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] outline-none focus:border-forest-500 resize-y" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Date cible</label>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-[11px] outline-none focus:border-forest-500" />
              </div>
              <button onClick={() => onSubmit(car.id, rootCause, action, targetDate)} disabled={submitting || !action.trim()}
                className="px-4 py-2 bg-forest-700 text-white rounded-lg text-[11px] font-semibold hover:bg-forest-900 disabled:opacity-50 flex items-center gap-1.5">
                <Check size={12} /> Soumettre la r&eacute;ponse
              </button>
            </div>
          ) : car.status !== 'open' && car.client_action ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1.5">
              {car.client_root_cause && <p className="text-[11px] text-gray-700"><strong>Cause racine :</strong> {car.client_root_cause}</p>}
              <p className="text-[11px] text-gray-700"><strong>Action :</strong> {car.client_action}</p>
              {car.client_target_date && (
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Clock size={10} /> Date cible : {new Date(car.client_target_date).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
