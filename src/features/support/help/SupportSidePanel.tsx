import { Bug, ClipboardList, Lightbulb, ListChecks, ChevronRight } from 'lucide-react'
import { HelpContactBanner } from './HelpContactBanner'

type Action = 'bug' | 'demande' | 'suggestion' | 'mine'

interface Props {
  onSelect: (action: Action) => void
}

const INTAKE: { mode: Action; icon: JSX.Element; title: string; desc: string }[] = [
  { mode: 'bug', icon: <Bug size={18} className="text-forest-700" />, title: 'Signaler un bug', desc: 'Quelque chose ne fonctionne pas.' },
  { mode: 'demande', icon: <ClipboardList size={18} className="text-forest-700" />, title: 'Faire une demande', desc: 'Accès, fonctionnalité, plan…' },
  { mode: 'suggestion', icon: <Lightbulb size={18} className="text-forest-700" />, title: 'Suggérer une amélioration', desc: 'Une idée pour le produit.' },
]

/** Rail latéral de l'accueil du Centre d'aide : intake + suivi + coordonnées. */
export function SupportSidePanel({ onSelect }: Props): JSX.Element {
  return (
    <aside className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <p className="px-4 pt-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Contacter le support</p>
        {INTAKE.map((a, i) => (
          <button
            key={a.mode}
            onClick={() => onSelect(a.mode)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${i > 0 ? 'border-t border-gray-100' : ''}`}
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-forest-100 bg-forest-50">{a.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-gray-900">{a.title}</span>
              <span className="block text-[11.5px] text-gray-400">{a.desc}</span>
            </span>
            <ChevronRight size={16} className="flex-shrink-0 text-gray-300" />
          </button>
        ))}
      </div>

      <button
        onClick={() => onSelect('mine')}
        className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-all hover:border-forest-300 hover:shadow-sm"
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-forest-100 bg-forest-50">
          <ListChecks size={18} className="text-forest-700" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-gray-900">Suivre mes demandes</span>
          <span className="block text-[11.5px] text-gray-400">Statut de vos tickets.</span>
        </span>
        <ChevronRight size={16} className="flex-shrink-0 text-gray-300" />
      </button>

      <HelpContactBanner />
    </aside>
  )
}
