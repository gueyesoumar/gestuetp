import { useState, useEffect } from 'react'
import { Bug, ClipboardList, Lightbulb, ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useRecorder } from '../features/support/recorder/RecorderContext'
import { RecordHero } from '../features/support/recorder/RecordHero'
import { BugRecapForm } from '../features/support/recorder/BugRecapForm'
import { DemandeForm } from '../features/support/DemandeForm'
import { SuggestionForm } from '../features/support/SuggestionForm'

type Mode = 'home' | 'bug' | 'demande' | 'suggestion'

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
            Choisissez ce que vous souhaitez faire &mdash; on adapte le formulaire et l&apos;acheminement.
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
        </>
      )}

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
