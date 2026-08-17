import { useState } from 'react'
import { Plus, Trash2, FileText, Info } from 'lucide-react'
import { usePolicyRegister } from './usePolicyRegister'
import { useSelfDimensionScores } from '../hub/useSelfDimensionScores'
import { PolicyCreateModal } from './PolicyCreateModal'
import { PolicyDetailDrawer } from './PolicyDetailDrawer'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import {
  POLICY_STATUS, POLICY_PROVENANCE, SCORE_DIMENSION_LABELS, SCORE_DIMENSION_COLORS,
} from '../../lib/constants'
import type { Policy, PolicyStatus } from '../../types/database.types'

const provLabel = (v: string): string => POLICY_PROVENANCE.find((p) => p.value === v)?.label ?? v

export function PolicyBoardPage(): JSX.Element {
  const reg = usePolicyRegister()
  const score = useSelfDimensionScores()
  const [modal, setModal] = useState(false)
  const [detail, setDetail] = useState<Policy | null>(null)

  if (reg.loading) return <LoadingSpinner />
  if (reg.error) return <ErrorAlert message={reg.error} />

  const pm = score.policyMaturity

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><FileText size={20} className="text-[#6D5AE6]" /> Registre des politiques</h1>
          <p className="mt-1 text-[13px] text-gray-500">Chaque politique suit son cycle de vie — brouillon → publiée → révision → retirée.</p>
        </div>
        <button onClick={() => setModal(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-[#6D5AE6] rounded-lg hover:brightness-110">
          <Plus size={16} /> Nouvelle politique
        </button>
      </div>

      {pm && (
        <div className="rounded-xl border border-[#6D5AE6]/30 bg-[#6D5AE6]/[0.06] px-4 py-3 flex items-center gap-3 flex-wrap">
          <Info size={15} className="text-[#4B3BC4] shrink-0" />
          <p className="text-[13px] text-gray-700">
            Maturité de gouvernance&nbsp;: <b>{pm.score}/100</b> <span className="text-gray-500">(gouvernance {pm.governance ?? '—'} · adoption {pm.adoption ?? '—'} · vérifiabilité {pm.verifiability ?? '—'})</span>. {score.composite === null
              ? <>Alimentera les axes <b>gouvernance / vérifiabilité</b> dès qu&apos;une <b>posture</b> existera.</>
              : score.policyImpactActive
                ? <>Intégrée aux axes → confiance <b>{score.composite}</b> ({pm.deltaPts >= 0 ? '+' : ''}{pm.deltaPts} pts).</>
                : <>Mode <b>shadow</b>&nbsp;: {pm.deltaPts >= 0 ? '+' : ''}{pm.deltaPts} pts <i>si activ&eacute;</i> (score actuel <b>{score.composite}</b>, inchang&eacute;).</>}
          </p>
        </div>
      )}

      {reg.policies.length === 0 ? (
        <EmptyState title="Aucune politique" description="Créez votre première politique avec le bouton ci-dessus." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {POLICY_STATUS.map((col) => {
            const items = reg.policies.filter((p) => p.status === col.value)
            return (
              <div key={col.value}>
                <h5 className="font-mono text-[10px] uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5">
                  {col.label}<span className="ml-auto bg-white border border-gray-200 rounded-full px-1.5 text-gray-500">{items.length}</span>
                </h5>
                <div className="space-y-2">
                  {items.map((p) => <PolicyCard key={p.id} policy={p} onOpen={setDetail} onSetStatus={reg.setStatus} onDelete={reg.deletePolicy} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && <PolicyCreateModal onClose={() => setModal(false)} onCreate={reg.createPolicy} />}
      {detail && <PolicyDetailDrawer policy={detail} onClose={() => setDetail(null)} onChanged={() => { reg.refresh(); setDetail(null) }} />}
    </div>
  )
}

function PolicyCard({ policy, onOpen, onSetStatus, onDelete }: {
  policy: Policy
  onOpen: (p: Policy) => void
  onSetStatus: (id: string, status: PolicyStatus) => Promise<void>
  onDelete: (id: string) => Promise<void>
}): JSX.Element {
  const dimColor = policy.dimension ? SCORE_DIMENSION_COLORS[policy.dimension] : '#94A3B8'
  const sealed = policy.status === 'approved' || policy.status === 'published'
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
      <button onClick={() => onOpen(policy)} className="text-[12.5px] font-semibold text-gray-900 leading-snug text-left hover:text-[#6D5AE6]">{policy.title}</button>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className="text-[9.5px] font-semibold uppercase tracking-wide text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">{provLabel(policy.provenance)}</span>
        {policy.dimension && <span className="text-[9.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: `${dimColor}22`, color: dimColor }}>{SCORE_DIMENSION_LABELS[policy.dimension]}</span>}
        {sealed && <span className="text-[10px] text-[#B8891F]" title="Approuvée / scellée">⬤</span>}
      </div>
      <div className="flex items-center gap-1.5 mt-2.5">
        <select value={policy.status} onChange={(e) => void onSetStatus(policy.id, e.target.value as PolicyStatus)}
          className="flex-1 text-[11px] border border-gray-200 rounded-md px-1.5 py-1 text-gray-600 bg-white">
          {POLICY_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={() => void onDelete(policy.id)} className="text-gray-300 hover:text-red-500" aria-label="Supprimer"><Trash2 size={13} /></button>
      </div>
    </div>
  )
}
