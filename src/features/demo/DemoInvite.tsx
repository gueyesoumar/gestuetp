import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Compass, Zap, GraduationCap } from 'lucide-react'
import { useDemoSandbox, type DemoVariant } from './useDemoSandbox'

/**
 * Invitation « mode découverte » sur le Hub vide : l'utilisateur choisit une
 * variante (guidée / pré-remplie) et crée un bac à sable jetable. Rendu sur le
 * thème du Hub (variables --hub-fg). Ne s'affiche que si l'utilisateur n'a pas
 * déjà une démo (géré par le parent).
 */
const OPTIONS: Array<{ key: DemoVariant; icon: typeof Compass; label: string; desc: string; recommended?: boolean }> = [
  { key: 'guided', icon: Compass, label: 'Bac à sable guidé', desc: 'Vous créez la mission, pas à pas.', recommended: true },
  { key: 'prefilled', icon: Zap, label: 'Démo pré-remplie', desc: 'Une mission déjà créée, prête à explorer.' },
]

export function DemoInvite(): JSX.Element {
  const navigate = useNavigate()
  const { seed, seeding } = useDemoSandbox()
  const [variant, setVariant] = useState<DemoVariant>('guided')

  const onCreate = async (): Promise<void> => {
    const ok = await seed(variant)
    if (ok) navigate(variant === 'prefilled' ? '/missions' : '/clients')
  }

  return (
    <div className="mx-auto mt-4 w-full max-w-[620px] rounded-2xl border border-[rgb(var(--hub-fg)/0.12)] bg-[rgb(var(--hub-fg)/0.04)] p-4">
      <div className="flex items-center gap-2 text-[rgb(var(--hub-fg)/0.9)]">
        <GraduationCap size={16} className="text-[#D4A843]" />
        <span className="text-[13px] font-semibold">Découvrir avec des données de démonstration</span>
      </div>
      <p className="mt-1 text-[11.5px] text-[rgb(var(--hub-fg)/0.55)]">Choisissez votre point de départ — supprimable à tout moment.</p>

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
