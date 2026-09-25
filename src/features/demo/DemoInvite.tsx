import { useState } from 'react'
import { Compass, Zap, GraduationCap, Check, ShieldCheck } from 'lucide-react'
import { useDemoSandbox, type DemoVariant } from './useDemoSandbox'
import { useDemoLens } from './DemoLensContext'

/**
 * Invitation « mode découverte » sur le Hub. Deux ACTIONS distinctes (chacune son
 * bouton, sans étape de sélection) : un espace d'exemple prêt à parcourir, ou un
 * espace vide guidé. À la création, la lentille démo s'active pour que le score
 * s'allume. Rendu sur le thème du Hub (variables --hub-fg). Masqué si démo existe.
 */
const PREFILLED: string[] = ['3 missions à des stades variés', 'Score de confiance & radar renseignés', 'Constats par gravité + un client']
const GUIDED: string[] = ['Vous gardez la main', 'Accompagné pas à pas par Doudou']

export function DemoInvite(): JSX.Element {
  const { seed, seeding } = useDemoSandbox()
  const { setLensOn } = useDemoLens()
  const [pending, setPending] = useState<DemoVariant | null>(null)

  const create = async (variant: DemoVariant): Promise<void> => {
    setPending(variant)
    const ok = await seed(variant)
    setPending(null)
    if (ok) setLensOn(true)
  }

  return (
    <div className="mx-auto mt-4 w-full max-w-[640px] rounded-2xl border border-[rgb(var(--hub-fg)/0.12)] bg-[rgb(var(--hub-fg)/0.04)] p-4">
      <div className="flex items-center gap-2 text-[rgb(var(--hub-fg)/0.9)]">
        <GraduationCap size={16} className="text-[#D4A843]" />
        <span className="text-[13px] font-semibold">Essayez Gëstu avec un espace de démonstration</span>
      </div>
      <p className="mt-1 text-[11.5px] text-[rgb(var(--hub-fg)/0.55)]">Un espace jetable et cloisonné : explorez librement, vos vrais indicateurs n{'’'}en tiennent jamais compte.</p>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {/* Action 1 — espace d'exemple (recommandé) */}
        <div className="relative flex flex-col rounded-xl border border-[#D4A843] bg-[#D4A843]/10 p-3.5">
          <span className="absolute -top-2 left-3 rounded-md bg-[#D4A843] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#0f2820]">Recommandé · prêt en ~15 s</span>
          <Zap size={17} className="text-[#D4A843]" />
          <div className="mt-1.5 text-[12.5px] font-bold text-[rgb(var(--hub-fg)/0.92)]">Explorer un espace d{'’'}exemple</div>
          <div className="mt-0.5 text-[10.5px] leading-snug text-[rgb(var(--hub-fg)/0.55)]">Un cabinet complet, prêt à parcourir tout de suite.</div>
          <ul className="mt-2 flex flex-1 flex-col gap-1">
            {PREFILLED.map((p) => (
              <li key={p} className="flex items-start gap-1.5 text-[10.5px] text-[rgb(var(--hub-fg)/0.62)]"><Check size={11} className="mt-0.5 shrink-0 text-[#D4A843]" />{p}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => void create('prefilled')}
            disabled={seeding}
            className="mt-3 rounded-[10px] bg-gradient-to-br from-[#D4A843] to-[#E2C26B] px-4 py-2 text-[11.5px] font-bold text-[#0f2820] transition-all disabled:opacity-60"
          >
            {pending === 'prefilled' ? 'Création…' : 'Créer l’espace d’exemple →'}
          </button>
        </div>

        {/* Action 2 — partir de zéro (guidé) */}
        <div className="flex flex-col rounded-xl border border-[rgb(var(--hub-fg)/0.14)] bg-[rgb(var(--hub-fg)/0.03)] p-3.5">
          <Compass size={17} className="text-[#D4A843]" />
          <div className="mt-1.5 text-[12.5px] font-bold text-[rgb(var(--hub-fg)/0.92)]">Partir de zéro</div>
          <div className="mt-0.5 text-[10.5px] leading-snug text-[rgb(var(--hub-fg)/0.55)]">Un espace vide et un tour guidé pour créer votre première mission.</div>
          <ul className="mt-2 flex flex-1 flex-col gap-1">
            {GUIDED.map((p) => (
              <li key={p} className="flex items-start gap-1.5 text-[10.5px] text-[rgb(var(--hub-fg)/0.62)]"><Check size={11} className="mt-0.5 shrink-0 text-[#7FC79E]" />{p}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => void create('guided')}
            disabled={seeding}
            className="mt-3 rounded-[10px] border border-[rgb(var(--hub-fg)/0.25)] px-4 py-2 text-[11.5px] font-bold text-[rgb(var(--hub-fg)/0.9)] transition-all hover:border-[rgb(var(--hub-fg)/0.4)] disabled:opacity-60"
          >
            {pending === 'guided' ? 'Création…' : 'Commencer à vide'}
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[10.5px] text-[rgb(var(--hub-fg)/0.5)]">
        <ShieldCheck size={12} className="text-[#7FC79E]" />
        Aucun impact sur vos données réelles · supprimable à tout moment
      </div>
    </div>
  )
}
