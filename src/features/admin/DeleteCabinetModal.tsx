import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'

interface Props {
  cabinetId: string
  cabinetName: string
  onClose: () => void
}

const CONFIRM_KEYWORD = 'SUPPRIMER'

export function DeleteCabinetModal({ cabinetId, cabinetName, onClose }: Props) {
  const [nameConfirm, setNameConfirm] = useState('')
  const [keywordConfirm, setKeywordConfirm] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [forceDelete, setForceDelete] = useState(false)
  const [activeMissionsBlocking, setActiveMissionsBlocking] = useState<number | null>(null)
  const navigate = useNavigate()
  const toast = useToast()

  const ready = nameConfirm === cabinetName && keywordConfirm === CONFIRM_KEYWORD && reason.trim().length > 0

  const submit = async () => {
    setSubmitting(true)
    const { data, error } = await supabase.functions.invoke('admin-delete-cabinet', {
      body: {
        cabinet_id: cabinetId,
        cabinet_name_confirmation: nameConfirm,
        reason,
        force: forceDelete,
      },
    })
    setSubmitting(false)
    if (error) {
      toast.error('Suppression impossible', error)
      return
    }
    if (data?.error) {
      // Cas particulier : missions actives — propose force
      if (typeof data.active_missions === 'number') {
        setActiveMissionsBlocking(data.active_missions)
        return
      }
      toast.error('Suppression refusée')
      console.error('admin-delete-cabinet:', data.error)
      return
    }
    toast.success('Organisation supprimée', { description: cabinetName })
    onClose()
    navigate('/admin/cabinets')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-xl">
        <div className="bg-red-50 border-b border-red-200 px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-700 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[14.5px] font-bold text-red-700">Suppression définitive</h3>
            <p className="text-[12px] text-red-700 mt-0.5 leading-relaxed">
              Cette action efface l&apos;organisation <b>{cabinetName}</b>, toutes ses missions, contrôles, documents et utilisateurs.
              <b> Irréversible.</b> Un snapshot léger est conservé dans l&apos;audit log.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
              Tapez le nom exact de l&apos;organisation : <code className="font-mono text-gray-700">{cabinetName}</code>
            </label>
            <input type="text" value={nameConfirm} onChange={(e) => setNameConfirm(e.target.value)} disabled={submitting} placeholder={cabinetName} />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
              Tapez <code className="font-mono font-bold text-red-700">{CONFIRM_KEYWORD}</code> en majuscules
            </label>
            <input type="text" value={keywordConfirm} onChange={(e) => setKeywordConfirm(e.target.value)} disabled={submitting} placeholder={CONFIRM_KEYWORD} />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Motif <span className="text-red-500">*</span></label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Contrat résilié le… / demande RGPD…" disabled={submitting} />
          </div>

          {activeMissionsBlocking !== null && (
            <label className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
              <input type="checkbox" checked={forceDelete} onChange={(e) => setForceDelete(e.target.checked)} className="mt-0.5" disabled={submitting} style={{ width: 'auto' }} />
              <span className="text-[12px] text-amber-800">
                Cette organisation a <b>{activeMissionsBlocking} mission(s) active(s) non clôturée(s)</b>. Cocher pour forcer la suppression — toutes ces missions seront détruites.
              </span>
            </label>
          )}
        </div>

        <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} disabled={submitting} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button
            onClick={submit}
            disabled={!ready || submitting || (activeMissionsBlocking !== null && !forceDelete)}
            className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </div>
      </div>
    </div>
  )
}
