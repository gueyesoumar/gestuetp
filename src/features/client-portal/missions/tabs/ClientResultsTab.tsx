import { useState } from 'react'
import { Check, X, AlertTriangle } from 'lucide-react'
import { useClientFindings } from './useClientFindings'
import { useClientActionItems } from './useClientActionItems'
import { ACTION_PRIORITY_LABELS, ACTION_STATUS_LABELS } from '../../client-constants'
import type { ClientMissionDetail } from '../useClientMissionDetail'
import type { ActionStatus } from '../../../../types/database.types'

interface Props {
  mission: ClientMissionDetail
  isContributor: boolean
  onRefetch: () => void
}

export function ClientResultsTab({ mission, isContributor }: Props): JSX.Element {
  const { findings, pendingCount, approvedCount, contestedCount, loading: fLoading, submitValidation, submitting } = useClientFindings(mission.id)
  const { items, loading: aLoading, updateStatus, updating } = useClientActionItems(mission.id)

  return (
    <div className="space-y-8">
      {/* ═══ Constats ═══ */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-bold">Constats &agrave; valider</h3>
          {pendingCount > 0 && <span className="text-[10px] font-medium text-gold-600 bg-gold-50 px-2 py-0.5 rounded-full">{pendingCount} en attente</span>}
          {approvedCount > 0 && <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{approvedCount} approuv&eacute;{approvedCount > 1 ? 's' : ''}</span>}
          {contestedCount > 0 && <span className="text-[10px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{contestedCount} contest&eacute;{contestedCount > 1 ? 's' : ''}</span>}
        </div>

        {fLoading ? (
          <p className="text-xs text-gray-400 text-center py-4">Chargement...</p>
        ) : findings.length > 0 ? (
          <div className="space-y-2.5">
            {findings.map((f) => (
              <FindingCard key={f.id} finding={f} isContributor={isContributor} onSubmit={submitValidation} submitting={submitting} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-xs text-gray-400">Les constats d&rsquo;audit appara&icirc;tront ici lorsque l&rsquo;auditeur les soumettra.</p>
          </div>
        )}
      </section>

      {/* ═══ Plan d'action ═══ */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-bold">Plan d&rsquo;action</h3>
          {items.length > 0 && <span className="text-[10px] font-medium text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full">{items.filter((i) => i.status !== 'done').length} en cours</span>}
        </div>

        {aLoading ? (
          <p className="text-xs text-gray-400 text-center py-4">Chargement...</p>
        ) : items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => {
              const prioConfig = ACTION_PRIORITY_LABELS[item.priority]
              const statusConfig = ACTION_STATUS_LABELS[item.status]
              const borderColor = item.priority === 'critical' ? 'border-l-red-500' : item.priority === 'high' ? 'border-l-orange-500' : item.priority === 'medium' ? 'border-l-gold-500' : 'border-l-gray-300'
              return (
                <div key={item.id} className={`border border-gray-200 rounded-lg bg-white border-l-[3px] ${borderColor} ${item.status === 'done' ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    {isContributor && item.status !== 'done' ? (
                      <button onClick={() => updateStatus(item.id, item.status === 'open' ? 'in_progress' : 'done' as ActionStatus)} disabled={updating}
                        className="w-5 h-5 border-2 border-gray-300 rounded flex items-center justify-center shrink-0 hover:border-green-500 transition-colors cursor-pointer">
                        {item.status === 'in_progress' && <span className="text-[10px] text-blue-500">&#9679;</span>}
                      </button>
                    ) : (
                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${item.status === 'done' ? 'bg-green-500 border-2 border-green-500' : 'border-2 border-gray-300'}`}>
                        {item.status === 'done' && <Check size={10} className="text-white" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${item.status === 'done' ? 'line-through text-gray-400' : ''}`}>{item.title}</p>
                      <div className="flex gap-2 mt-1 items-center">
                        {item.controlCode && <span className="font-mono text-[8px] font-semibold bg-forest-50 text-forest-700 px-1.5 py-0.5 rounded">{item.controlCode}</span>}
                        {prioConfig && <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${prioConfig.color}`}>{prioConfig.label}</span>}
                        {item.dueDate && <span className="text-[9px] text-gray-300">&Eacute;ch. {new Date(item.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                      </div>
                    </div>
                    {statusConfig && <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${statusConfig.color}`}>{statusConfig.label}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-xs text-gray-400">Les recommandations seront disponibles apr&egrave;s la validation des constats.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function FindingCard({ finding, isContributor, onSubmit, submitting }: {
  finding: ReturnType<typeof useClientFindings>['findings'][0]
  isContributor: boolean
  onSubmit: (id: string, decision: 'approved' | 'contested', comment: string) => Promise<boolean>
  submitting: boolean
}): JSX.Element {
  const [comment, setComment] = useState('')

  return (
    <div className={`border rounded-xl overflow-hidden ${finding.clientValidation === 'pending' ? 'border-gray-200' : finding.clientValidation === 'approved' ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
        <span className="font-mono text-[11px] font-semibold text-forest-700">{finding.controlCode}</span>
        <span className="text-xs font-semibold flex-1 truncate">{finding.controlName}</span>
        {finding.clientValidation === 'pending' && <span className="text-[10px] font-medium text-gold-600 bg-gold-50 px-2 py-0.5 rounded-full">&Agrave; valider</span>}
        {finding.clientValidation === 'approved' && <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5"><Check size={10} /> Approuv&eacute;</span>}
        {finding.clientValidation === 'contested' && <span className="text-[10px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5"><X size={10} /> Contest&eacute;</span>}
      </div>
      <div className="px-3 py-2.5 text-xs text-gray-700 leading-relaxed">
        {finding.findings}
        {finding.riskNotes && (
          <div className="mt-2 p-2 bg-orange-50 border-l-2 border-orange-400 rounded text-[11px] text-orange-700">
            <AlertTriangle size={12} className="inline mr-0.5" />{finding.riskNotes}
          </div>
        )}
      </div>
      {finding.clientValidation === 'pending' && isContributor && (
        <div className="flex gap-2 px-3 py-2.5 border-t border-gray-100 bg-gray-50/50">
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Commentaire (optionnel)..."
            className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded text-[11px] outline-none focus:border-forest-500" />
          <button onClick={() => onSubmit(finding.id, 'approved', comment)} disabled={submitting}
            className="px-3 py-1.5 bg-green-500 text-white rounded text-[11px] font-semibold hover:bg-green-600 disabled:opacity-50 inline-flex items-center gap-0.5"><Check size={11} /> Approuver</button>
          <button onClick={() => onSubmit(finding.id, 'contested', comment)} disabled={submitting}
            className="px-3 py-1.5 bg-white text-red-500 border border-red-400 rounded text-[11px] font-semibold hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-0.5"><X size={11} /> Contester</button>
        </div>
      )}
      {finding.clientComment && (
        <div className="px-3 py-2 border-t border-gray-100 text-[10px] text-gray-400">
          <b>Votre commentaire :</b> {finding.clientComment}
        </div>
      )}
    </div>
  )
}
