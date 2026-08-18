import { useState, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useFrameworks } from '../frameworks/useFrameworks'
import { useMembers } from '../members/useMembers'
import { useSubsidiaries } from '../group-module/useSubsidiaries'
import { EntityFormModal } from '../group-module/EntityFormModal'
import { useCreateMission } from '../missions/useCreateMission'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useToast } from '../../hooks/useToast'

/** Création d'une mission de contrôle sur un assujetti (Gëstu Regul / M3). */
export function RegulMissionCreatePage(): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const { frameworks, loading: fwLoading } = useFrameworks()
  const { members, loading: mLoading } = useMembers()
  const { subsidiaries, loading: sLoading, refresh } = useSubsidiaries()
  const { createMission, creating } = useCreateMission()

  // Pré-remplissage de l'assujetti quand on arrive depuis sa fiche (F2).
  const prefillAssujetti = (location.state as { assujettiId?: string } | null)?.assujettiId ?? ''
  const [assujettiId, setAssujettiId] = useState(prefillAssujetti)
  const [showEntityModal, setShowEntityModal] = useState(false)
  const [frameworkId, setFrameworkId] = useState('')
  const [name, setName] = useState('')
  const [leadId, setLeadId] = useState('')
  const [associateId, setAssociateId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fw = useMemo(() => frameworks.find((f) => f.id === frameworkId) ?? null, [frameworks, frameworkId])
  const assujetti = useMemo(() => subsidiaries.find((s) => s.id === assujettiId) ?? null, [subsidiaries, assujettiId])
  const autoName = fw && assujetti ? `${fw.name} — ${assujetti.name}` : ''

  if (fwLoading || mLoading || sLoading) return <LoadingSpinner />

  const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700'

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const finalName = (name || autoName).trim()
    if (!assujettiId || !frameworkId || !finalName || !leadId || !associateId || !startDate || !endDate) {
      toast.error('Tous les champs sont requis')
      return
    }
    if (endDate < startDate) { toast.error('La date de fin doit suivre la date de début'); return }
    const res = await createMission({
      name: finalName,
      description: '',
      assujetti_org_id: assujettiId,
      framework_id: frameworkId,
      lead_auditor_id: leadId,
      associate_id: associateId,
      start_date: startDate,
      end_date: endDate,
      member_ids: [...new Set([leadId, associateId])],
      kind: 'audit',
    })
    if (res.ok) { toast.success('Mission de contrôle créée'); navigate('/controles') }
    else toast.error(res.error ?? 'Création impossible')
  }

  return (
    <div className="max-w-2xl">
      <Link to="/controles" className="text-[13px] text-forest-700 hover:text-forest-900">&larr; Retour aux missions de contrôle</Link>
      <h1 className="mt-4 text-xl font-semibold text-gray-900">Nouvelle mission de contrôle</h1>
      <p className="mt-1 text-[13px] text-gray-500">Planifiez un audit sur un assujetti du parc régulé.</p>

      <form onSubmit={submit} className="mt-6 space-y-4 bg-white border border-gray-200 rounded-xl p-6">
        <div>
          <label className="block text-[12px] font-medium text-gray-600 mb-1">Assujetti *</label>
          <div className="flex items-center gap-2">
            <select value={assujettiId} onChange={(e) => setAssujettiId(e.target.value)} className={field}>
              <option value="">Sélectionner un assujetti…</option>
              {subsidiaries.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button type="button" onClick={() => setShowEntityModal(true)} className="inline-flex items-center gap-1 whitespace-nowrap px-3 py-2 text-[13px] font-semibold text-forest-700 border border-forest-200 rounded-lg hover:bg-forest-50">
              <Plus size={15} /> Nouvel assujetti
            </button>
          </div>
          {subsidiaries.length === 0 && <p className="mt-1 text-[11px] text-amber-600">Aucun assujetti recensé — créez-en un avec le bouton ci-dessus.</p>}
        </div>
        <div>
          <label className="block text-[12px] font-medium text-gray-600 mb-1">Référentiel *</label>
          <select value={frameworkId} onChange={(e) => setFrameworkId(e.target.value)} className={field}>
            <option value="">Sélectionner un référentiel…</option>
            {frameworks.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-gray-600 mb-1">Nom de la mission</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={autoName || 'Nom automatique'} className={field} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Chef de mission *</label>
            <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className={field}>
              <option value="">Sélectionner…</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Auditeur associé *</label>
            <select value={associateId} onChange={(e) => setAssociateId(e.target.value)} className={field}>
              <option value="">Sélectionner…</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Début *</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Fin *</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={field} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => navigate('/controles')} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button type="submit" disabled={creating} className="px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
            {creating ? 'Création…' : 'Créer la mission'}
          </button>
        </div>
      </form>

      {showEntityModal && (
        <EntityFormModal
          initial={null}
          parentOptions={subsidiaries.map((s) => ({ id: s.id, name: s.name }))}
          onClose={() => setShowEntityModal(false)}
          onSaved={(createdId) => {
            setShowEntityModal(false)
            refresh()
            if (createdId) setAssujettiId(createdId)
          }}
        />
      )}
    </div>
  )
}
