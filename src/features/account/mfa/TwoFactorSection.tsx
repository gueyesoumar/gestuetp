import { useState, useEffect, useCallback } from 'react'
import { Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useMfa } from '../../auth/mfa/useMfa'
import type { TotpFactor } from '../../auth/mfa/useMfa'
import { AddAuthenticatorDialog } from './AddAuthenticatorDialog'
import { RemoveAuthenticatorDialog } from './RemoveAuthenticatorDialog'

/**
 * Gestion self-service des authentificateurs 2FA (TOTP) : liste, ajout, retrait.
 * Le retrait du dernier facteur vérifié est bloqué (MFA obligatoire).
 */
export function TwoFactorSection(): JSX.Element {
  const { listTotpFactors } = useMfa()
  const [factors, setFactors] = useState<TotpFactor[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<TotpFactor | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setFactors(await listTotpFactors())
    setLoading(false)
  }, [listTotpFactors])

  useEffect(() => { void reload() }, [reload])

  const isLast = factors.length <= 1

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="grid grid-cols-[240px_1fr]">
        <div className="bg-page-bg border-r border-gray-200 p-6">
          <h4 className="text-[14px] font-semibold text-gray-900">Deux facteurs (2FA)</h4>
          <p className="mt-1 text-[12px] leading-relaxed text-gray-500">
            Vos applications d&apos;authentification. Le 2FA est requis sur tous les comptes.
          </p>
        </div>
        <div className="p-6 space-y-3">
          {loading ? (
            <p className="text-[13px] text-gray-400">Chargement&hellip;</p>
          ) : factors.length === 0 ? (
            <p className="text-[13px] text-gray-500">Aucun authentificateur.</p>
          ) : (
            factors.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <ShieldCheck size={18} className="text-forest-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-gray-900 truncate">{f.friendlyName}</div>
                    <div className="text-[12px] text-gray-400">
                      Ajouté le {new Date(f.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setRemoveTarget(f)}
                  disabled={isLast}
                  title={isLast ? 'Ajoutez un autre authentificateur avant de retirer celui-ci.' : 'Retirer'}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50 hover:border-red-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-gray-200"
                >
                  <Trash2 size={14} /> Retirer
                </button>
              </div>
            ))
          )}

          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-[13px] font-medium text-forest-700 transition-colors hover:bg-forest-50 hover:border-forest-300"
          >
            <Plus size={16} /> Ajouter un authentificateur
          </button>
        </div>
      </div>

      <AddAuthenticatorDialog open={addOpen} onClose={() => setAddOpen(false)} onAdded={reload} />
      <RemoveAuthenticatorDialog open={removeTarget !== null} onClose={() => setRemoveTarget(null)} factor={removeTarget} onRemoved={reload} />
    </div>
  )
}
