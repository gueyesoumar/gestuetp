import { useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { useDemoSandbox } from './useDemoSandbox'

/**
 * Bandeau « Mode découverte » affiché sur les pages de l'app quand l'utilisateur
 * possède un bac à sable. Permet de tout supprimer en un clic (confirmation
 * inline). Ne rend rien si l'utilisateur n'a pas de démo.
 */
export function DemoModeBanner(): JSX.Element | null {
  const { hasDemo, loading, teardown, deleting } = useDemoSandbox()
  const [confirming, setConfirming] = useState(false)

  if (loading || !hasDemo) return null

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#EBD79B] bg-[#FBF3DD] px-4 py-2.5 text-[12px] font-medium text-[#8a6516]">
      <GraduationCap size={15} className="shrink-0" />
      <span>Mode découverte — vous explorez des données de démonstration.</span>
      <div className="ml-auto flex items-center gap-2">
        {confirming ? (
          <>
            <span className="text-[11.5px] text-[#8a6516]">Tout supprimer ?</span>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="rounded-lg border border-[#e0dccf] bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => void teardown()}
              disabled={deleting}
              className="rounded-lg bg-[#a4472b] px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50"
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-[#e6bfb2] bg-white px-3 py-1 text-[11px] font-bold text-[#a4472b]"
          >
            Tout supprimer
          </button>
        )}
      </div>
    </div>
  )
}
