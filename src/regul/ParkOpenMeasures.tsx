import { useMemo } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useParkMeasures } from './useParkMeasures'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { EmptyState } from '../components/ui/EmptyState'
import { MEASURE_TYPE_LABELS, MEASURE_STATUS_LABELS } from '../lib/constants'
import type { MeasureType } from '../lib/constants'

const TYPE_STYLE: Record<MeasureType, string> = {
  recommandation: 'bg-blue-50 text-blue-700',
  mise_en_demeure: 'bg-amber-50 text-amber-700',
  injonction: 'bg-orange-50 text-orange-700',
  sanction: 'bg-red-50 text-red-700',
}

/** Statut « ouvert » = ni résolu ni clôturé (aligné sur usePilotage.OPEN_MEASURE). */
const isOpen = (status: string): boolean => !['resolved', 'closed'].includes(status)

interface Props {
  /** Résolution du nom d'assujetti à partir de son id (parc courant). */
  entityNameById: Map<string, string>
}

/**
 * Vue transverse (lecture seule) des mesures ouvertes de tout le parc régulé —
 * cible de la carte « Mesures ouvertes » du tableau de bord. La RLS de
 * regulatory_measures cloisonne déjà au sous-arbre du régulateur.
 */
export function ParkOpenMeasures({ entityNameById }: Props): JSX.Element {
  const { measures, loading } = useParkMeasures()
  const open = useMemo(() => measures.filter((m) => isOpen(m.status)), [measures])

  if (loading) return <LoadingSpinner />
  if (open.length === 0) {
    return <EmptyState title="Aucune mesure ouverte" description="Toutes les mesures du parc sont résolues ou clôturées." />
  }

  return (
    <div className="space-y-3">
      {open.map((m) => (
        <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="mt-0.5 text-forest-600" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${TYPE_STYLE[m.measure_type]}`}>{MEASURE_TYPE_LABELS[m.measure_type]}</span>
                <span className="text-[11px] font-semibold text-forest-700">{entityNameById.get(m.entity_id) ?? 'Assujetti inconnu'}</span>
                <span className="font-semibold text-gray-900 text-[14px]">{m.title}</span>
              </div>
              <p className="mt-1 text-[12px] text-gray-500">
                {m.deadline && <>Délai&nbsp;: {new Date(m.deadline).toLocaleDateString('fr-FR')} · </>}
                Émise le {m.issued_at ? new Date(m.issued_at).toLocaleDateString('fr-FR') : '—'} · Statut&nbsp;: {MEASURE_STATUS_LABELS[m.status] ?? m.status}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
