import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import type { MemberWithRoles } from '../members/types'
import type { PortfolioOrg } from './useSupervisedPortfolio'
import type { AddAssignmentInput } from './useSupervisionAssignments'

interface Props {
  members: MemberWithRoles[]
  orgs: PortfolioOrg[]
  sectors: string[]
  onAdd: (input: AddAssignmentInput) => Promise<{ ok: boolean; error?: string }>
  /** Pré-sélection d'un assujetti depuis l'alerte « sans responsable ». */
  preset?: { orgId: string; nonce: number } | null
}

/** Formulaire d'ajout d'une affectation (membre -> assujetti ou secteur). */
export function SupervisionAssignmentForm({ members, orgs, sectors, onAdd, preset }: Props): JSX.Element {
  const [userId, setUserId] = useState('')
  const [scopeType, setScopeType] = useState<'org' | 'sector'>('org')
  const [scopeRef, setScopeRef] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!preset) return
    setScopeType('org')
    setScopeRef(preset.orgId)
    setErr(null)
  }, [preset])

  const canSubmit = userId !== '' && scopeRef !== '' && !busy

  async function submit(): Promise<void> {
    if (!canSubmit) return
    setBusy(true)
    setErr(null)
    const res = await onAdd(
      scopeType === 'org'
        ? { userId, scopeType, scopeOrgId: scopeRef }
        : { userId, scopeType, scopeSector: scopeRef },
    )
    setBusy(false)
    if (!res.ok) { setErr(res.error ?? 'Affectation impossible.') ; return }
    setScopeRef('')
  }

  const sel = 'px-3 py-2 text-[13px] border border-gray-300 rounded-lg bg-white outline-none focus:border-forest-500'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-bold text-gray-900 mb-3">Nouvelle affectation</h3>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-gray-500">Membre</span>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className={sel}>
            <option value="">Choisir un membre...</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-gray-500">Périmètre</span>
          <select value={scopeType} onChange={(e) => { setScopeType(e.target.value as 'org' | 'sector'); setScopeRef('') }} className={sel}>
            <option value="org">Un assujetti</option>
            <option value="sector">Un secteur (et ses futurs assujettis)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 min-w-[200px]">
          <span className="text-[11px] font-medium text-gray-500">{scopeType === 'org' ? 'Assujetti' : 'Secteur'}</span>
          <select value={scopeRef} onChange={(e) => setScopeRef(e.target.value)} className={sel}>
            <option value="">{scopeType === 'org' ? 'Choisir un assujetti...' : 'Choisir un secteur...'}</option>
            {scopeType === 'org'
              ? orgs.map((o) => (<option key={o.organization_id} value={o.organization_id}>{o.org_name}</option>))
              : sectors.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </label>
        <button
          onClick={submit} disabled={!canSubmit}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium ${canSubmit ? 'bg-forest-700 text-white hover:bg-forest-900' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
        >
          <Plus size={15} /> Affecter
        </button>
      </div>
      {err && <p className="mt-2 text-[12px] text-red-600">{err}</p>}
    </div>
  )
}
