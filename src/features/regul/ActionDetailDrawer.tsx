import { X, ArrowUpCircle, CheckCircle2, RotateCcw, ExternalLink } from 'lucide-react'
import { actionLabel, isActionOverdue, useManualAction, type TrackedAction } from './useActionTracking'
import { useToast } from '../../hooks/useToast'

const CLASS_LABEL: Record<string, string> = { major_nc: 'NC majeure', minor_nc: 'NC mineure', observation: 'Observation' }
const STATUS_LABEL: Record<string, string> = { open: 'Ouverte', client_responded: 'À vérifier', verified: 'Vérifiée', closed: 'Clôturée' }
const fmt = (d: string | null): string => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-')

interface Props {
  action: TrackedAction
  onEscalate: (action: TrackedAction) => void
  onOpenMission: (missionId: string) => void
  onChanged: () => void
  onClose: () => void
}

export function ActionDetailDrawer({ action: a, onEscalate, onOpenMission, onChanged, onClose }: Props): JSX.Element {
  const toast = useToast()
  const { busy, setStatus } = useManualAction()
  const isManual = a.source === 'manual'

  const toggle = async (next: 'open' | 'closed'): Promise<void> => {
    const res = await setStatus(a.id, next)
    if (!res.ok) { toast.error(res.error ?? 'Changement impossible'); return }
    toast.success(next === 'closed' ? 'Action clôturée' : 'Action rouverte'); onChanged()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{a.code}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isManual ? 'bg-violet-50 text-violet-700' : 'bg-forest-50 text-forest-700'}`}>{isManual ? 'Manuel' : 'Mission'}</span>
            {isActionOverdue(a) && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">En retard</span>}
            {a.escalated && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-700">Escaladée</span>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <Section label="Action à mener">
            <p className="text-[13.5px] text-gray-900 whitespace-pre-wrap">{actionLabel(a)}</p>
          </Section>

          {!isManual && (
            <>
              <Section label="Constat"><p className="text-[12.5px] text-gray-600 whitespace-pre-wrap">{a.description}</p></Section>
              {a.risk && <Section label="Risque identifié"><p className="text-[12.5px] text-gray-600 whitespace-pre-wrap">{a.risk}</p></Section>}
              {(a.control_code || a.control_name) && (
                <Section label="Contrôle"><p className="text-[12.5px] text-gray-600">{[a.control_code, a.control_name].filter(Boolean).join(' · ')}</p></Section>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Meta label="Assujetti" value={a.entity_name} />
            {a.mission_name && <Meta label="Mission" value={a.mission_name} />}
            <Meta label="Gravité" value={CLASS_LABEL[a.finding_classification] ?? a.finding_classification} />
            <Meta label="Statut" value={STATUS_LABEL[a.status] ?? a.status} />
            <Meta label="Échéance" value={fmt(a.client_target_date ?? a.deadline)} />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-2 flex-wrap sticky bottom-0 bg-white">
          {a.status !== 'closed' && (
            <button onClick={() => onEscalate(a)} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-50">
              <ArrowUpCircle size={15} /> Escalader en mesure
            </button>
          )}
          {isManual ? (
            a.status === 'closed' ? (
              <button onClick={() => void toggle('open')} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"><RotateCcw size={15} /> Rouvrir</button>
            ) : (
              <button onClick={() => void toggle('closed')} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50"><CheckCircle2 size={15} /> Clôturer</button>
            )
          ) : a.mission_id ? (
            <button onClick={() => onOpenMission(a.mission_id!)} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-forest-700 hover:bg-forest-50 rounded-lg">Ouvrir la mission <ExternalLink size={14} /></button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      {children}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-[12.5px] text-gray-800">{value}</p>
    </div>
  )
}
