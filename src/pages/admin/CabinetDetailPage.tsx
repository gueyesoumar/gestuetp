import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAdminCabinetDetail } from '../../features/admin/useAdminCabinetDetail'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useToast } from '../../hooks/useToast'
import { DeleteCabinetModal } from '../../features/admin/DeleteCabinetModal'
import { CabinetFeatureFlagsTab } from '../../features/admin/CabinetFeatureFlagsTab'
import { CabinetMembersTab } from '../../features/admin/CabinetMembersTab'
import { CabinetMissionsTab } from '../../features/admin/CabinetMissionsTab'
import { CabinetBillingTab } from '../../features/admin/CabinetBillingTab'
import { CabinetAuditLogTab } from '../../features/admin/CabinetAuditLogTab'
import { CabinetWhiteLabelTab } from '../../features/admin/branding/CabinetWhiteLabelTab'
import { CabinetOverviewTab } from '../../features/admin/health/CabinetOverviewTab'
import { EditOrganizationTypesModal } from '../../features/admin/EditOrganizationTypesModal'
import { labelOrganizationType } from '../../features/admin/cabinetLabels'

type TabKey = 'overview' | 'members' | 'missions' | 'billing' | 'whitelabel' | 'flags' | 'audit'

export function CabinetDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { cabinet, loading, error, refetch } = useAdminCabinetDetail(id)
  const [actionInFlight, setActionInFlight] = useState<'suspend' | 'reactivate' | 'export' | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [reasonModal, setReasonModal] = useState<'suspend' | 'reactivate' | 'export' | null>(null)
  const [reason, setReason] = useState('')
  const [typesModalOpen, setTypesModalOpen] = useState(false)

  if (loading) return <div className="p-8"><LoadingSpinner /></div>
  if (error || !cabinet) return <div className="p-8"><ErrorAlert message={error ?? 'Organisation introuvable'} /></div>

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
        toast.success(reasonModal === 'suspend' ? 'Organisation suspendue' : 'Organisation réactivée', { description: cabinet.name })
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
          <ChevronLeft size={14} /> Retour aux organisations
        </button>
      </div>

      <div className="flex items-center gap-3 mt-3 mb-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-extrabold ${cabinet.is_active ? 'bg-forest-100 text-forest-700' : 'bg-red-50 text-red-600'}`}>{initials}</div>
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">{cabinet.name}</h1>
          <div className="text-[11.5px] text-gray-500">{labelOrganizationType(cabinet.types)} · onboardé le {new Date(cabinet.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {cabinet.is_active ? (
            <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-[11px] font-semibold">Actif</span>
          ) : (
            <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-[11px] font-semibold">Suspendu</span>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto">
        <TabBtn k="overview" label="Vue d'ensemble" active={activeTab === 'overview'} onClick={setActiveTab} />
        <TabBtn k="members" label={`Membres · ${cabinet.members.length}`} active={activeTab === 'members'} onClick={setActiveTab} />
        <TabBtn k="missions" label={`Missions · ${cabinet.missions.length}`} active={activeTab === 'missions'} onClick={setActiveTab} />
        <TabBtn k="billing" label="Facturation" active={activeTab === 'billing'} onClick={setActiveTab} />
        <TabBtn k="whitelabel" label="Marque blanche" active={activeTab === 'whitelabel'} onClick={setActiveTab} />
        <TabBtn k="flags" label="Feature flags" active={activeTab === 'flags'} onClick={setActiveTab} />
        <TabBtn k="audit" label="Audit log" active={activeTab === 'audit'} onClick={setActiveTab} />
      </div>

      {activeTab === 'overview' && (
        <CabinetOverviewTab
          cabinet={cabinet}
          onSuspend={() => setReasonModal('suspend')}
          onReactivate={() => setReasonModal('reactivate')}
          onExport={() => setReasonModal('export')}
          onDelete={() => setDeleteOpen(true)}
          onEditTypes={() => setTypesModalOpen(true)}
        />
      )}

      {activeTab === 'members' && <CabinetMembersTab cabinetId={cabinet.id} />}
      {activeTab === 'missions' && <CabinetMissionsTab cabinetId={cabinet.id} />}
      {activeTab === 'billing' && <CabinetBillingTab cabinet={cabinet} />}
      {activeTab === 'whitelabel' && <CabinetWhiteLabelTab cabinetId={cabinet.id} cabinetName={cabinet.name} />}
      {activeTab === 'flags' && <CabinetFeatureFlagsTab cabinetId={cabinet.id} />}
      {activeTab === 'audit' && <CabinetAuditLogTab cabinetId={cabinet.id} />}

      {deleteOpen && (
        <DeleteCabinetModal
          cabinetId={cabinet.id}
          cabinetName={cabinet.name}
          onClose={() => setDeleteOpen(false)}
        />
      )}

      {typesModalOpen && (
        <EditOrganizationTypesModal
          organizationId={cabinet.id}
          organizationName={cabinet.name}
          currentTypes={cabinet.types}
          onClose={() => setTypesModalOpen(false)}
          onSuccess={refetch}
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

function TabBtn({ k, label, active, onClick }: { k: TabKey; label: string; active: boolean; onClick: (k: TabKey) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(k)}
      className={`px-4 py-2 text-[12.5px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${active ? 'border-gold-500 text-forest-900 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
    >
      {label}
    </button>
  )
}

