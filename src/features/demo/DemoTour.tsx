import { useState } from 'react'
import { Compass, Eye, FolderOpen, LogOut } from 'lucide-react'
import { useDemoSandbox } from './useDemoSandbox'

/**
 * Tour guidé du mode démo (E4 — Vague 1). S'affiche UNE fois, sur le Hub, quand
 * l'utilisateur vient de créer un bac à sable. Explique pas à pas la lentille, le
 * score qui prend vie, l'exploration d'une mission et la sortie. « Vu » persiste
 * en localStorage (par navigateur) — non bloquant, refermable à tout moment.
 */
const KEY = 'gestu.demo.tour'

function seen(): boolean {
  try { return localStorage.getItem(KEY) === 'done' } catch { return false }
}

interface Step { icon: typeof Compass; title: string; body: string }
const STEPS: Step[] = [
  { icon: Compass, title: 'Bienvenue dans le mode démo', body: 'Vous explorez un espace jetable et cloisonné. Vos vrais indicateurs (facturation, quotas, statistiques du cabinet) n’en tiennent jamais compte.' },
  { icon: Eye, title: 'Votre score prend vie', body: 'La « lentille » affiche vos données de démo dans le score de confiance et les dashboards. Vous l’allumez ou l’éteignez depuis le bandeau « Mode découverte ».' },
  { icon: FolderOpen, title: 'Explorez une vraie mission', body: 'Ouvrez le module Comply : missions à différents stades, contrôles évalués, constats par gravité — tout est là pour parcourir un terrain réaliste.' },
  { icon: LogOut, title: 'Quand vous voulez', body: 'Depuis le bandeau, terminez et nettoyez en un clic — ou basculez vers la configuration réelle de votre cabinet.' },
]

export function DemoTour(): JSX.Element | null {
  const { hasDemo, loading } = useDemoSandbox()
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(seen)

  if (loading || !hasDemo || dismissed) return null

  const close = (): void => {
    setDismissed(true)
    try { localStorage.setItem(KEY, 'done') } catch { /* stockage indisponible */ }
  }
  const s = STEPS[step]
  const Icon = s.icon
  const last = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" style={{ background: 'rgba(9,22,17,0.62)' }} role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 p-6 text-center" style={{ background: 'linear-gradient(160deg,#12291F,#0C1F17)' }}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'rgba(212,168,67,0.16)' }}>
          <Icon size={22} className="text-[#D4A843]" />
        </div>
        <div className="mb-1 font-mono text-[10px] font-bold tracking-[0.14em] text-white/40">ÉTAPE {step + 1} / {STEPS.length}</div>
        <h2 className="text-[18px] font-bold tracking-[-0.3px] text-white">{s.title}</h2>
        <p className="mx-auto mt-3 max-w-[19rem] text-[13px] leading-relaxed text-white/65">{s.body}</p>

        <div className="mt-5 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === step ? 18 : 6, background: i === step ? '#D4A843' : 'rgba(255,255,255,0.2)' }} />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button type="button" onClick={close} className="text-[12px] font-medium text-white/40 hover:text-white/70">
            Passer le tour
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep((v) => v - 1)} className="rounded-lg border border-white/15 px-3 py-2 text-[12px] font-semibold text-white/75">
                Précédent
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? close() : setStep((v) => v + 1))}
              className="rounded-lg px-4 py-2 text-[12px] font-bold text-[#0f2820]"
              style={{ background: 'linear-gradient(135deg,#D4A843,#E2C26B)' }}
            >
              {last ? 'Terminer' : 'Suivant →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
