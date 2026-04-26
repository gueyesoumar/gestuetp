import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Download, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAdminCabinetDetail } from '../../features/admin/useAdminCabinetDetail'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useToast } from '../../hooks/useToast'
import { DeleteCabinetModal } from '../../features/admin/DeleteCabinetModal'

export function CabinetDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { cabinet, loading, error, refetch } = useAdminCabinetDetail(id)
  const [actionInFlight, setActionInFlight] = useState<'suspend' | 'reactivate' | 'export' | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [reasonModal, setReasonModal] = useState<'suspend' | 'reactivate' | 'export' | null>(null)
  const [reason, setReason] = useState('')

  if (loading) return <div className="p-8"><LoadingSpinner /></div>
  if (error || !cabinet) return <div className="p-8"><ErrorAlert message={error ?? 'Cabinet introuvable'} /></div>

  const initials = cabinet.name.charAt(0).toUpperCase()

  const submitAction = async () => {
    if (!reasonModal || !reason.trim()) return
    setActionInFlight(reasonModal)
    try {
      if (reasonModal === 'export') {
        const { data: { session } } = await supabase.auth.getSession()
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-cabinet`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ action: 'export', cabinet_id: cabinet.id, reason }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? 'Export impossible')
        }
        const blob = await res.blob()
        const dl = document.createElement('a')
        dl.href = URL.createObjectURL(blob)
        dl.download = `cabinet-${cabinet.slug}-${new Date().toISOString().slice(0, 10)}.csv`
        dl.click()
        URL.revokeObjectURL(dl.href)
        toast.success('Export téléchargé', { description: cabinet.name })
      } else {
        const { data, error: fnError } = await supabase.functions.invoke('admin-cabinet', {
          body: { action: reasonModal, cabinet_id: cabinet.id, reason },
        })
        if (fnError) throw new Error(fnError.message)
        if (data?.error) throw new Error(data.error)
        toast.success(reasonModal === 'suspend' ? 'Cabinet suspendu' : 'Cabinet réactivé', { description: cabinet.name })
        refetch()
      }
      setReasonModal(null)
      setReason('')
    } catch (err) {
      toast.error('Action impossible', err)
    } finally {
      setActionInFlight(null)
    }
  }

  return (
    <div className="px-7 py-6">
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => navigate('/admin/cabinets')} className="text-[12px] text-forest-700 font-semibold hover:text-forest-900 inline-flex items-center gap-1">
          <ChevronLeft size={14} /> Retour aux cabinets
        </button>
      </div>

      <div className="flex items-center gap-3 mt-3 mb-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-extrabold ${cabinet.is_active ? 'bg-forest-100 text-forest-700' : 'bg-red-50 text-red-600'}`}>{initials}</div>
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">{cabinet.name}</h1>
          <div className="text-[11.5px] text-gray-500">Cabinet · onboardé le {new Date(cabinet.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {cabinet.is_active ? (
            <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-[11px] font-semibold">Actif</span>
          ) : (
            <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-[11px] font-semibold">Suspendu</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-5">
        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <header className="px-4 py-3 border-b border-gray-200">
            <span className="text-[13px] font-bold text-gray-900">Identité</span>
          </header>
          <div className="px-5 py-4">
            <dl className="grid grid-cols-[140px_1fr] gap-y-2.5 gap-x-5 text-[13px]">
              <dt className="text-gray-500 text-[12px]">Nom</dt><dd className="text-gray-900 font-medium">{cabinet.name}</dd>
              <dt className="text-gray-500 text-[12px]">Slug</dt><dd className="text-gray-900 font-mono text-[12px]">{cabinet.slug}</dd>
              <dt className="text-gray-500 text-[12px]">Plan</dt><dd className="text-gray-900">{cabinet.plan_name ?? '—'}{cabinet.plan_price != null && cabinet.plan_price > 0 ? ` · ${cabinet.plan_price} €/mois` : ''}</dd>
              <dt className="text-gray-500 text-[12px]">Onboardé</dt><dd className="text-gray-900">{new Date(cabinet.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
              <dt className="text-gray-500 text-[12px]">Membres</dt><dd className="text-gray-900">{cabinet.members.length}</dd>
              <dt className="text-gray-500 text-[12px]">Missions</dt><dd className="text-gray-900">{cabinet.missions.length}</dd>
            </dl>
          </div>

          <header className="px-4 py-3 border-y border-gray-200">
            <span className="text-[13px] font-bold text-gray-900">Missions récentes</span>
          </header>
          <div className="px-5 py-3">
            {cabinet.missions.length === 0 ? (
              <div className="text-[12px] text-gray-300 py-2">Aucune mission.</div>
            ) : (
              <ul className="space-y-2">
                {cabinet.missions.slice(0, 8).map((m) => (
                  <li key={m.id} className="flex items-center gap-3 text-[12.5px] py-1.5 border-b border-gray-100 last:border-b-0">
                    <span className="font-semibold text-gray-900 truncate flex-1">{m.name}</span>
                    <span className="text-[11px] text-gray-300 capitalize">{m.status.replaceAll('_', ' ')}</span>
                    <span className="text-[10.5px] text-gray-300 w-24 text-right">{new Date(m.updated_at).toLocaleDateString('fr-FR')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="space-y-4">
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <header className="px-4 py-3 border-b border-gray-200">
              <span className="text-[13px] font-bold text-gray-900">Membres ({cabinet.members.length})</span>
            </header>
            <div className="px-4 py-3">
              {cabinet.members.slice(0, 6).map((m) => (
                <Link key={m.id} to={`/admin/utilisateurs/${m.id}`} className="flex items-center gap-2.5 py-1.5 border-b border-gray-100 last:border-b-0 hover:bg-page-bg -mx-2 px-2 rounded">
                  <div className="w-7 h-7 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center font-extrabold text-[10.5px]">{m.first_name.charAt(0)}{m.last_name.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold text-gray-900 truncate">{m.first_name} {m.last_name}</div>
                    <div className="text-[10.5px] text-gray-300 truncate">{m.job_title ?? m.email}</div>
                  </div>
                  {!m.is_active && <span className="text-[10px] text-red-600 font-semibold">Inactif</span>}
                </Link>
              ))}
              {cabinet.members.length > 6 && (
                <div className="text-[11px] text-gray-300 pt-2 border-t border-gray-100">+ {cabinet.members.length - 6} autres &mdash; <Link to="/admin/utilisateurs" className="text-forest-700 font-semibold">recherche</Link></div>
              )}
            </div>
          </section>

          <section className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h4 className="text-[12px] uppercase tracking-wider text-red-700 font-bold mb-1.5">Zone sensible</h4>
            <p className="text-[11.5px] text-red-700 leading-relaxed mb-3">Toute action est tracée dans l&apos;audit log avec le motif que vous saisirez.</p>
            <div className="flex flex-wrap gap-2">
              {cabinet.is_active ? (
                <button onClick={() => setReasonModal('suspend')} className="px-3 py-1.5 border border-red-400 bg-white text-red-700 rounded-lg text-[12px] font-semibold hover:bg-red-50">Suspendre</button>
              ) : (
                <button onClick={() => setReasonModal('reactivate')} className="px-3 py-1.5 border border-green-400 bg-white text-green-700 rounded-lg text-[12px] font-semibold hover:bg-green-50">Réactiver</button>
              )}
              <button onClick={() => setReasonModal('export')} className="px-3 py-1.5 border border-red-200 bg-white text-red-700 rounded-lg text-[12px] font-semibold hover:bg-red-50 inline-flex items-center gap-1">
                <Download size={12} /> Exporter CSV
              </button>
              <button onClick={() => setDeleteOpen(true)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[12px] font-semibold hover:bg-red-700 inline-flex items-center gap-1">
                <Trash2 size={12} /> Supprimer définitivement
              </button>
            </div>
          </section>
        </div>
      </div>

      {deleteOpen && (
        <DeleteCabinetModal
          cabinetId={cabinet.id}
          cabinetName={cabinet.name}
          onClose={() => setDeleteOpen(false)}
        />
      )}

      {reasonModal && (
        <ReasonModal
          title={reasonModal === 'suspend' ? `Suspendre ${cabinet.name} ?` : reasonModal === 'reactivate' ? `Réactiver ${cabinet.name} ?` : `Exporter les données de ${cabinet.name}`}
          submitLabel={reasonModal === 'suspend' ? 'Suspendre' : reasonModal === 'reactivate' ? 'Réactiver' : 'Exporter'}
          danger={reasonModal === 'suspend'}
          reason={reason}
          onChangeReason={setReason}
          submitting={actionInFlight !== null}
          onCancel={() => { setReasonModal(null); setReason('') }}
          onSubmit={submitAction}
        />
      )}
    </div>
  )
}

function ReasonModal({ title, submitLabel, danger, reason, onChangeReason, submitting, onCancel, onSubmit }: {
  title: string; submitLabel: string; danger?: boolean; reason: string; onChangeReason: (v: string) => void; submitting: boolean; onCancel: () => void; onSubmit: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-[14.5px] font-bold text-gray-900">{title}</h3>
        </div>
        <div className="px-5 py-4">
          <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Motif <span className="text-red-500">*</span></label>
          <textarea
            value={reason}
            onChange={(e) => onChangeReason(e.target.value)}
            placeholder="Pourquoi cette action ? (obligatoire)"
            rows={3}
            className="w-full"
            disabled={submitting}
          />
          <p className="mt-2 text-[11px] text-gray-400">Le motif est tracé dans l&apos;audit log et conservé indéfiniment.</p>
        </div>
        <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onCancel} disabled={submitting} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button
            onClick={onSubmit}
            disabled={submitting || !reason.trim()}
            className={`px-3.5 py-2 text-[12.5px] font-semibold rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-forest-700 hover:bg-forest-900'}`}
          >
            {submitting ? 'En cours…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
