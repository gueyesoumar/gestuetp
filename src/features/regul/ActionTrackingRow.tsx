import { ClipboardList, ExternalLink, CheckCircle2, RotateCcw, ArrowUpCircle } from 'lucide-react'
import { actionLabel, isActionOverdue, useManualAction, type TrackedAction } from './useActionTracking'
import { useToast } from '../../hooks/useToast'

const CLASS_BADGE: Record<string, { label: string; color: string }> = {
  major_nc: { label: 'NC Maj.', color: 'text-red-700 bg-red-50' },
  minor_nc: { label: 'NC Min.', color: 'text-orange-700 bg-orange-50' },
  observation: { label: 'Obs.', color: 'text-blue-700 bg-blue-50' },
}
const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  open: { label: 'Ouverte', color: 'text-amber-700 bg-amber-50' },
  client_responded: { label: 'À vérifier', color: 'text-blue-700 bg-blue-50' },
  verified: { label: 'Vérifiée', color: 'text-green-700 bg-green-50' },
  closed: { label: 'Clôturée', color: 'text-gray-500 bg-gray-100' },
}
const fmtDate = (d: string | null): string =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'

interface Props {
  action: TrackedAction
  onOpenDetail: (action: TrackedAction) => void
  onOpenMission: (missionId: string) => void
  onEscalate: (action: TrackedAction) => void
  onChanged: () => void
}

export function ActionTrackingRow({ action: a, onOpenDetail, onOpenMission, onEscalate, onChanged }: Props): JSX.Element {
  const toast = useToast()
  const { busy, setStatus } = useManualAction()
  const cls = CLASS_BADGE[a.finding_classification]
  const st = STATUS_BADGE[a.status]
  const overdue = isActionOverdue(a)
  const isManual = a.source === 'manual'

  const toggle = async (next: 'open' | 'closed'): Promise<void> => {
    const res = await setStatus(a.id, next)
    if (!res.ok) { toast.error(res.error ?? 'Changement impossible'); return }
    toast.success(next === 'closed' ? 'Action clôturée' : 'Action rouverte'); onChanged()
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50">
      <ClipboardList size={16} className="mt-0.5 text-forest-600 flex-shrink-0" />
      <button onClick={() => onOpenDetail(a)} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-[13px]">{a.code}</span>
          {cls && <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${cls.color}`}>{cls.label}</span>}
          {st && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${st.color}`}>{st.label}</span>}
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isManual ? 'bg-violet-50 text-violet-700' : 'bg-forest-50 text-forest-700'}`}>
            {isManual ? 'Manuel' : 'Mission'}
          </span>
          {overdue && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">En retard</span>}
          {a.escalated && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-700">Escaladée</span>}
        </div>
        <p className="mt-0.5 text-[12.5px] text-gray-800 truncate">{actionLabel(a)}</p>
        <p className="mt-0.5 text-[11.5px] text-gray-400">
          {a.entity_name}{a.mission_name ? ` · ${a.mission_name}` : ''} · Échéance {fmtDate(a.client_target_date ?? a.deadline)}
        </p>
      </button>
      <div className="flex-shrink-0 flex items-center gap-1">
        {a.status !== 'closed' && (
          <button onClick={() => onEscalate(a)} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-orange-700 hover:bg-orange-50 rounded-lg" title="Escalader en mesure">
            <ArrowUpCircle size={13} /> Escalader
          </button>
        )}
        {isManual ? (
          a.status === 'closed' ? (
            <button onClick={() => void toggle('open')} disabled={busy} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50">
              <RotateCcw size={13} /> Rouvrir
            </button>
          ) : (
            <button onClick={() => void toggle('closed')} disabled={busy} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-green-700 hover:bg-green-50 rounded-lg disabled:opacity-50">
              <CheckCircle2 size={13} /> Clôturer
            </button>
          )
        ) : (
          <button onClick={() => a.mission_id && onOpenMission(a.mission_id)} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-forest-700 hover:bg-forest-50 rounded-lg">
            Mission <ExternalLink size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
