import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import type { DemoVariant } from './useDemoSandbox'
import { GestuFingerprint } from '../support/onboarding/GestuFingerprint'

// Overlay de progression pendant la création de l'espace de démo (Lot E).
// L'edge seed-demo-data est un appel unique bloquant : la progression est donc
// ESTIMÉE (les étapes avancent au fil du temps, barre indéterminée). L'overlay
// disparaît dès que la création se termine (le parent efface `variant`).

const STEPS: Record<DemoVariant, string[]> = {
  prefilled: ["Création de l'espace cloisonné", 'Ajout du client de démonstration', 'Génération des 3 missions & contrôles', 'Constats, score & radar'],
  guided: ["Création de l'espace cloisonné", 'Préparation de votre première mission'],
}

export function DemoCreationProgress({ variant }: { variant: DemoVariant | null }): JSX.Element | null {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!variant) { setStep(0); return }
    const steps = STEPS[variant]
    const id = window.setInterval(() => {
      // On avance sans jamais « terminer » : la dernière étape reste en cours
      // jusqu'à ce que la vraie création se résolve et démonte l'overlay.
      setStep((s) => Math.min(s + 1, steps.length - 1))
    }, 2200)
    return () => window.clearInterval(id)
  }, [variant])

  if (!variant) return null
  const steps = STEPS[variant]

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-forest-900/50 p-4">
      <div className="w-[24rem] max-w-full overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 bg-gradient-to-br from-forest-900 to-forest-700 px-5 py-4 text-white">
          <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-forest-900"><GestuFingerprint size={22} /></span>
          <div>
            <p className="text-[14px] font-bold leading-tight">Préparation de votre espace…</p>
            <p className="text-[11.5px] text-forest-100">Quelques secondes — vous pourrez tout supprimer ensuite.</p>
          </div>
        </div>

        <div className="p-4">
          <ul className="flex flex-col gap-3">
            {steps.map((label, i) => {
              const done = i < step
              const running = i === step
              return (
                <li key={label} className="flex items-center gap-3 text-[13px]">
                  <span className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-full ${done ? 'bg-forest-500 text-white' : running ? 'border-2 border-gold-500 bg-gold-100 text-gold-600' : 'bg-gray-100 text-gray-400'}`}>
                    {done ? <Check size={13} /> : running ? <Loader2 size={12} className="animate-spin" /> : <span className="text-[11px]">{i + 1}</span>}
                  </span>
                  <span className={done || running ? 'font-medium text-gray-800' : 'text-gray-400'}>{label}</span>
                </li>
              )
            })}
          </ul>

          {/* Barre indéterminée (progression estimée). */}
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full w-1/3 animate-[demoslide_1.3s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-forest-500 to-gold-500" />
          </div>
        </div>
      </div>
      <style>{`@keyframes demoslide{0%{transform:translateX(-120%)}100%{transform:translateX(360%)}}`}</style>
    </div>
  )
}
