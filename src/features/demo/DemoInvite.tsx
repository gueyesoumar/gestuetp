import { useState } from 'react'
import { Compass, Zap, GraduationCap, Check } from 'lucide-react'
import { useDemoSandbox, type DemoVariant } from './useDemoSandbox'
import { useDemoLens } from './DemoLensContext'

/**
 * Invitation « mode découverte » sur le Hub : l'utilisateur choisit une intention
 * et crée un bac à sable jetable. À la création, la lentille démo s'active pour
 * que le score et les dashboards s'allument immédiatement. Rendu sur le thème du
 * Hub (variables --hub-fg). Ne s'affiche que si l'utilisateur n'a pas déjà une démo.
 */
const OPTIONS: Array<{ key: DemoVariant; icon: typeof Compass; label: string; desc: string; recommended?: boolean }> = [
  { key: 'prefilled', icon: Zap, label: 'Explorer une mission déjà faite', desc: 'Un scénario complet — 3 missions, un radar renseigné, des constats — prêt à parcourir.', recommended: true },
  { key: 'guided', icon: Compass, label: 'Construire pas à pas', desc: 'Vous créez votre première mission, accompagné par un tour guidé.' },
]

const PREVIEW: Record<DemoVariant, string[]> = {
  prefilled: ['3 missions à des stades variés', 'Score de confiance renseigné', 'Constats par gravité'],
  guided: ['1 client de démonstration', 'Un tour pas à pas', 'Vous gardez la main'],
}

export function DemoInvite(): JSX.Element {
  const { seed, seeding } = useDemoSandbox()
  const { setLensOn } = useDemoLens()
  const [variant, setVariant] = useState<DemoVariant>('prefilled')

  const onCreate = async (): Promise<void> => {
    const ok = await seed(variant)
    if (ok) setLensOn(true) // allume la lentille : le score/dashboards prennent vie
  }

  return (
    <div className="mx-auto mt-4 w-full max-w-[620px] rounded-2xl border border-[rgb(var(--hub-fg)/0.12)] bg-[rgb(var(--hub-fg)/0.04)] p-4">
      <div className="flex items-center gap-2 text-[rgb(var(--hub-fg)/0.9)]">
        <GraduationCap size={16} className="text-[#D4A843]" />
        <span className="text-[13px] font-semibold">Découvrir avec des données de démonstration</span>
      </div>
      <p className="mt-1 text-[11.5px] text-[rgb(var(--hub-fg)/0.55)]">Un espace jetable, cloisonné, supprimable à tout moment. Vos vrais indicateurs n{'’'}en tiennent jamais compte.</p>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {OPTIONS.map((o) => {
          const Icon = o.icon
          const selected = variant === o.key
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => setVariant(o.key)}
              disabled={seeding}
              className={`relative rounded-xl border p-3 text-left transition-all disabled:opacity-60 ${
                selected
                  ? 'border-[#D4A843] bg-[#D4A843]/12 shadow-[0_0_0_2px_rgba(212,168,67,0.25)]'
                  : 'border-[rgb(var(--hub-fg)/0.14)] bg-[rgb(var(--hub-fg)/0.03)] hover:border-[rgb(var(--hub-fg)/0.3)]'
              }`}
            >
              {o.recommended && (
                <span className="absolute -top-2 right-2.5 rounded-md bg-[#D4A843] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#0f2820]">
                  Recommandé
                </span>
              )}
              <Icon size={17} className="text-[#D4A843]" />
              <div className="mt-1.5 text-[12px] font-bold text-[rgb(var(--hub-fg)/0.92)]">{o.label}</div>
              <div className="mt-0.5 text-[10.5px] leading-snug text-[rgb(var(--hub-fg)/0.55)]">{o.desc}</div>
            </button>
          )
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {PREVIEW[variant].map((p) => (
          <li key={p} className="flex items-center gap-1.5 text-[10.5px] text-[rgb(var(--hub-fg)/0.6)]">
            <Check size={11} className="text-[#7FC79E]" />{p}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => void onCreate()}
        disabled={seeding}
        className="mt-3 rounded-[10px] bg-gradient-to-br from-[#D4A843] to-[#E2C26B] px-4 py-2 text-[11.5px] font-bold text-[#0f2820] transition-all disabled:opacity-60"
      >
        {seeding ? 'Création…' : 'Créer mon espace de démo →'}
      </button>
    </div>
  )
}
