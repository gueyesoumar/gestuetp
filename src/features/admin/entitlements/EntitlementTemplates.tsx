import { useState } from 'react'
import type { TemplatePlan } from './useOrgEntitlements'

interface Props {
  plans: TemplatePlan[]
  busy: boolean
  onApply: (slug: string, reason: string) => Promise<boolean>
}

/** Blocs de templates (plans) applicables en un clic → sème les entitlements. */
export function EntitlementTemplates({ plans, busy, onApply }: Props) {
  const [pending, setPending] = useState<TemplatePlan | null>(null)
  const [reason, setReason] = useState('')

  const confirm = async () => {
    if (!pending) return
    const ok = await onApply(pending.slug, reason.trim())
    if (ok) { setPending(null); setReason('') }
  }

  if (plans.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-[13px] font-bold text-gray-900 mb-1">Appliquer un template</h3>
      <p className="text-[11.5px] text-gray-500 mb-3">Sème les droits du plan dans les entitlements (préserve les droits manuels).</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {plans.map((p) => (
          <div key={p.slug} className="rounded-lg border border-gray-200 p-3 flex flex-col gap-2">
            <div>
              <div className="text-[13px] font-semibold text-gray-900">{p.name}</div>
              <div className="text-[11px] text-gray-400 font-mono">{p.slug}</div>
            </div>
            <button onClick={() => setPending(p)}
              className="mt-auto px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-forest-300 text-forest-700 hover:bg-forest-50">
              Appliquer
            </button>
          </div>
        ))}
      </div>

      {pending && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-[14.5px] font-bold text-gray-900">Appliquer &laquo; {pending.name} &raquo;</h3>
            </div>
            <div className="px-5 py-4">
              <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1">Motif <span className="text-red-500">*</span></label>
              <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700" />
              <p className="mt-2 text-[11px] text-gray-400">Tracé dans l&apos;audit log. Les droits manuels ne sont pas écrasés.</p>
            </div>
            <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => { setPending(null); setReason('') }} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button onClick={confirm} disabled={busy || reason.trim().length === 0}
                className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg text-white bg-forest-700 hover:bg-forest-900 disabled:opacity-50">Appliquer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
