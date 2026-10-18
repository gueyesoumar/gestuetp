import { useState } from 'react'

/**
 * Reapplique le plan de l'organisation (modules + quotas) via l'action apply_plan
 * de l'edge admin-entitlement. Les droits manuels sont preserves, les surcharges
 * de plan sont ecrasees. Motif obligatoire (tracé dans le journal d'audit).
 */
export function ReapplyPlanButton({ busy, onReapply }: { busy: boolean; onReapply: (reason: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')

  const submit = async () => {
    if (!reason.trim()) return
    const ok = await onReapply(reason.trim())
    if (ok) { setOpen(false); setReason('') }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 text-gray-700 rounded-lg text-[12.5px] font-semibold hover:bg-gray-50"
      >
        Réappliquer le plan
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-[14.5px] font-bold text-gray-900">Réappliquer le plan</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-[12.5px] text-gray-600 mb-3">
                Réaligne les modules et quotas sur le plan de l&apos;organisation. Les droits manuels sont préservés ; les surcharges de plan sont écrasées.
              </p>
              <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Motif <span className="text-red-500">*</span></label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full" disabled={busy} placeholder="Pourquoi ce réalignement ?" />
            </div>
            <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => { setOpen(false); setReason('') }} disabled={busy} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button onClick={submit} disabled={busy || !reason.trim()} className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg text-white bg-forest-700 hover:bg-forest-900 disabled:opacity-50">
                {busy ? 'En cours...' : 'Réappliquer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
