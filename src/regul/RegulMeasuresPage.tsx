import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, ArrowUpCircle, ShieldAlert, X } from 'lucide-react'
import { useSubsidiaries } from '../features/group-module/useSubsidiaries'
import { useMeasures, useIssueMeasure, type Measure } from './useMeasures'
import { MeasureFormModal } from './MeasureFormModal'
import { ParkOpenMeasures } from './ParkOpenMeasures'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../hooks/useToast'
import { useVocab } from '../features/edition/useVocab'
import { MEASURE_TYPE_LABELS, MEASURE_STATUS_LABELS, MEASURE_TYPE_ORDER } from '../lib/constants'
import type { MeasureType } from '../lib/constants'

const TYPE_STYLE: Record<MeasureType, string> = {
  recommandation: 'bg-blue-50 text-blue-700',
  mise_en_demeure: 'bg-amber-50 text-amber-700',
  injonction: 'bg-orange-50 text-orange-700',
  sanction: 'bg-red-50 text-red-700',
}
const STATUS_FLOW = ['issued', 'acknowledged', 'resolved', 'appealed', 'closed']

export function RegulMeasuresPage(): JSX.Element {
  const toast = useToast()
  const vocab = useVocab()
  const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
  const { subsidiaries, loading: sLoading } = useSubsidiaries()
  const [entityId, setEntityId] = useState('')
  const { measures, loading, refresh } = useMeasures(entityId || null)
  const { setStatus } = useIssueMeasure()
  const [modal, setModal] = useState<{ source: Measure | null } | null>(null)

  // Vue parc (mesures ouvertes de tout le périmètre) — cible de la carte dashboard.
  const [searchParams, setSearchParams] = useSearchParams()
  const parcMode = searchParams.get('vue') === 'parc' && !entityId
  const entityNameById = useMemo(() => new Map(subsidiaries.map((s) => [s.id, s.name])), [subsidiaries])
  const exitParc = (): void => {
    const next = new URLSearchParams(searchParams)
    next.delete('vue')
    setSearchParams(next, { replace: true })
  }

  if (sLoading) return <LoadingSpinner />

  const changeStatus = async (m: Measure, status: string): Promise<void> => {
    const res = await setStatus(m.id, status)
    if (!res.ok) { toast.error(res.error ?? 'Changement impossible'); return }
    toast.success('Statut mis à jour'); refresh()
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{cap(vocab.findingTerm)}s &amp; {vocab.measureTerm}s</h1>
        <p className="mt-1 text-[13px] text-gray-500">Actes gradués du régulateur, ancrés dans le journal probant.</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select value={entityId} onChange={(e) => setEntityId(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg w-72 focus:border-forest-700 focus:ring-1 focus:ring-forest-700">
          <option value="">Sélectionner un assujetti…</option>
          {subsidiaries.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {entityId && (
          <button onClick={() => setModal({ source: null })} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900">
            <Plus size={16} /> Émettre une {vocab.measureTerm}
          </button>
        )}
      </div>

      {parcMode ? (
        <>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1 text-[12px] font-semibold text-forest-700">
              Vue parc&nbsp;: mesures ouvertes
              <button onClick={exitParc} className="text-forest-500 hover:text-forest-900" aria-label="Quitter la vue parc"><X size={13} /></button>
            </span>
            <span className="text-[12px] text-gray-400">Sélectionnez un assujetti ci-dessus pour agir sur ses mesures.</span>
          </div>
          <ParkOpenMeasures entityNameById={entityNameById} />
        </>
      ) : !entityId ? (
        <EmptyState title="Aucun assujetti sélectionné" description="Choisissez un assujetti pour consulter et émettre ses mesures." />
      ) : loading ? (
        <LoadingSpinner />
      ) : measures.length === 0 ? (
        <EmptyState title={`Aucune ${vocab.measureTerm}`} description="Émettez une première mesure (recommandation, mise en demeure…) avec le bouton ci-dessus." />
      ) : (
        <div className="space-y-3">
          {measures.map((m) => (
            <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert size={18} className="mt-0.5 text-forest-600" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${TYPE_STYLE[m.measure_type]}`}>{MEASURE_TYPE_LABELS[m.measure_type]}</span>
                      {m.parent_measure_id && <span className="text-[10px] text-gray-400">escalade</span>}
                      <span className="font-semibold text-gray-900 text-[14px]">{m.title}</span>
                    </div>
                    <p className="mt-1 text-[12px] text-gray-500">
                      {m.legal_basis && <>Base&nbsp;: {m.legal_basis} · </>}
                      {m.deadline && <>Délai&nbsp;: {new Date(m.deadline).toLocaleDateString('fr-FR')} · </>}
                      Émise le {m.issued_at ? new Date(m.issued_at).toLocaleDateString('fr-FR') : '—'}
                    </p>
                    {m.body && <p className="mt-1.5 text-[12.5px] text-gray-700">{m.body}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select value={m.status} onChange={(e) => void changeStatus(m, e.target.value)} className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-600">
                    {STATUS_FLOW.map((s) => <option key={s} value={s}>{MEASURE_STATUS_LABELS[s]}</option>)}
                  </select>
                  {MEASURE_TYPE_ORDER.indexOf(m.measure_type) < MEASURE_TYPE_ORDER.length - 1 && (
                    <button onClick={() => setModal({ source: m })} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-orange-700 hover:bg-orange-50 rounded-lg">
                      <ArrowUpCircle size={13} /> Escalader
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <MeasureFormModal
          entityId={entityId}
          source={modal.source}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refresh() }}
        />
      )}
    </div>
  )
}
