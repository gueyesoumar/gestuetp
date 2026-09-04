import { useState, useEffect } from 'react'
import { Bug, ClipboardList, Lightbulb, ArrowLeft, ListChecks, ChevronRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useRecorder } from '../features/support/recorder/RecorderContext'
import { RecordHero } from '../features/support/recorder/RecordHero'
import { BugRecapForm } from '../features/support/recorder/BugRecapForm'
import { DemandeForm } from '../features/support/DemandeForm'
import { SuggestionForm } from '../features/support/SuggestionForm'
import { MySupportRequests } from '../features/support/MySupportRequests'
import { HelpBrowse } from '../features/support/help/HelpBrowse'
import { HelpContactBanner } from '../features/support/help/HelpContactBanner'

type Mode = 'home' | 'bug' | 'demande' | 'suggestion' | 'mine'

interface Choice {
  mode: Mode
  icon: JSX.Element
  title: string
  desc: string
}

const CHOICES: Choice[] = [
  { mode: 'bug', icon: <Bug size={26} className="text-forest-700" />, title: 'Signaler un bug', desc: 'Quelque chose ne fonctionne pas comme prévu.' },
  { mode: 'demande', icon: <ClipboardList size={26} className="text-forest-700" />, title: 'Faire une demande', desc: 'Mot de passe, accès, fonctionnalité, plan…' },
  { mode: 'suggestion', icon: <Lightbulb size={26} className="text-forest-700" />, title: 'Suggérer une amélioration', desc: 'Une idée pour faire évoluer le produit.' },
]

export function SupportCenterPage(): JSX.Element {
  const { profile } = useAuth()
  const recorder = useRecorder()
  const [mode, setMode] = useState<Mode>('home')

  // Au retour d'un enregistrement (stop -> navigation vers le centre d'aide), ouvrir le recap.
  useEffect(() => { if (recorder.lastTrace) setMode('bug') }, [recorder.lastTrace])

  if (!profile) return <p className="p-6 text-sm text-gray-400">Chargement&hellip;</p>

  const back = (): void => setMode('home')

  return (
    <div className="max-w-3xl mx-auto p-6">
      {mode === 'home' && (
        <>
          <h1 className="text-xl font-bold text-gray-900">Centre d&apos;aide</h1>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Trouvez une réponse en quelques secondes &mdash; ou contactez notre équipe.
          </p>

          <HelpBrowse />

          <p className="mt-8 mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Vous ne trouvez pas&nbsp;? Contactez le support
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {CHOICES.map((c) => (
              <button
                key={c.mode}
                onClick={() => setMode(c.mode)}
                className="text-center bg-white border border-gray-200 rounded-xl p-5 hover:border-forest-500 hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-forest-50 border border-forest-100 mx-auto mb-3 flex items-center justify-center">
                  {c.icon}
                </div>
                <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{c.desc}</p>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <HelpContactBanner />
          </div>

          <button
            onClick={() => setMode('mine')}
            className="mt-6 flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left hover:border-forest-300 hover:shadow-sm transition-all"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 border border-forest-100">
              <ListChecks size={20} className="text-forest-700" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-gray-900">Suivre mes demandes</span>
              <span className="block text-xs text-gray-400">Consultez le statut de vos tickets.</span>
            </span>
            <ChevronRight size={18} className="text-gray-300" />
          </button>
        </>
      )}

      {mode === 'mine' && <MySupportRequests profile={profile} onBack={back} />}

      {mode === 'bug' && (
        <div>
          <button onClick={back} className="flex items-center gap-1.5 text-sm text-gray-400 mb-4 hover:text-gray-600">
            <ArrowLeft size={15} /> Centre d&apos;aide
          </button>
          {recorder.lastTrace ? (
            <BugRecapForm profile={profile} cabinetId={profile.organization_id} missionId={null} onDone={back} />
          ) : (
            <RecordHero onStart={recorder.start} />
          )}
        </div>
      )}

      {mode === 'demande' && (
        <DemandeForm profile={profile} cabinetId={profile.organization_id} missionId={null} onBack={back} />
      )}
      {mode === 'suggestion' && (
        <SuggestionForm profile={profile} cabinetId={profile.organization_id} missionId={null} onBack={back} />
      )}
    </div>
  )
}
