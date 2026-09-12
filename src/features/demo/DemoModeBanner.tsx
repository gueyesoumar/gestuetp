import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useDemoSandbox } from './useDemoSandbox'
import { useDemoLens } from './DemoLensContext'

/**
 * Bandeau « Mode découverte » — centre de contrôle de la démo. Affiché sur toutes
 * les pages quand l'utilisateur possède un bac à sable. Porte :
 *   - la bascule LENTILLE (afficher / masquer ma démo dans le score et les dashboards) ;
 *   - une sortie à deux choix : configurer pour de vrai, ou terminer et nettoyer.
 * `tone` : « light » sur les pages standard, « dark » sur le Hub. Ne rend rien
 * si l'utilisateur n'a pas de démo.
 */
export function DemoModeBanner({ tone = 'light' }: { tone?: 'light' | 'dark' }): JSX.Element | null {
  const navigate = useNavigate()
  const { hasDemo, loading, teardown, deleting, seed, seeding } = useDemoSandbox()
  const { lensOn, setLensOn } = useDemoLens()
  const [exiting, setExiting] = useState(false)

  if (loading || !hasDemo) return null

  const regenerate = async (): Promise<void> => {
    const cleared = await teardown()
    if (!cleared) return
    const ok = await seed('prefilled')
    if (ok) setLensOn(true)
  }
  const busy = deleting || seeding

  const dark = tone === 'dark'
  const shell = dark
    ? 'border-[rgb(var(--hub-fg)/0.18)] bg-[rgb(var(--hub-fg)/0.06)] text-[rgb(var(--hub-fg)/0.85)]'
    : 'border-[#EBD79B] bg-[#FBF3DD] text-[#8a6516]'
  const chip = dark ? 'border-[rgb(var(--hub-fg)/0.2)] bg-[rgb(var(--hub-fg)/0.06)]' : 'border-[#e6d9a8] bg-white/70'
  const btnGhost = dark
    ? 'border-[rgb(var(--hub-fg)/0.25)] bg-transparent text-[rgb(var(--hub-fg)/0.75)]'
    : 'border-[#e0dccf] bg-white text-gray-600'

  const cleanup = async (then?: () => void): Promise<void> => {
    const ok = await teardown()
    if (ok) { setLensOn(false); then?.() }
  }

  return (
    <div className={`mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-4 py-2.5 text-[12px] font-medium ${shell}`}>
      <GraduationCap size={15} className="shrink-0" />
      <span>Mode découverte — vous explorez des données de démonstration.</span>

      {/* Bascule lentille : allume/éteint ma démo dans le score & les dashboards */}
      <button
        type="button"
        onClick={() => setLensOn(!lensOn)}
        aria-pressed={lensOn}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${chip}`}
        title="Afficher ou masquer la démo dans le score et les dashboards"
      >
        {lensOn ? <Eye size={13} /> : <EyeOff size={13} />}
        {lensOn ? 'Visible dans le score' : 'Masquée du score'}
      </button>

      <div className="ml-auto flex items-center gap-2">
        {exiting ? (
          <>
            <button
              type="button"
              onClick={() => void cleanup(() => navigate('/organisation'))}
              disabled={deleting}
              className="rounded-lg bg-[#2f7d5b] px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50"
            >
              {deleting ? 'Nettoyage…' : 'Configurer pour de vrai'}
            </button>
            <button
              type="button"
              onClick={() => void cleanup()}
              disabled={deleting}
              className="rounded-lg bg-[#a4472b] px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50"
            >
              Terminer et nettoyer
            </button>
            <button
              type="button"
              onClick={() => setExiting(false)}
              disabled={deleting}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50 ${btnGhost}`}
            >
              Annuler
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void regenerate()}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50 ${btnGhost}`}
              title="Supprimer et recréer un espace de démonstration neuf"
            >
              <RefreshCw size={12} className={seeding ? 'animate-spin' : ''} />
              {busy ? 'Régénération…' : 'Régénérer'}
            </button>
            <button
              type="button"
              onClick={() => setExiting(true)}
              className={`rounded-lg border px-3 py-1 text-[11px] font-bold ${dark ? 'border-[rgb(var(--hub-fg)/0.3)] text-[rgb(var(--hub-fg)/0.85)]' : 'border-[#e6bfb2] bg-white text-[#a4472b]'}`}
            >
              Quitter la démo
            </button>
          </>
        )}
      </div>
    </div>
  )
}
