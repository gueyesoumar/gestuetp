import { useState } from 'react'
import { Bug, ClipboardList, Lightbulb, ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useRecorder } from '../features/support/recorder/RecorderContext'
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
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                Enregistrement termin&eacute; &mdash; {recorder.lastTrace.length} &eacute;tape{recorder.lastTrace.length > 1 ? 's' : ''}
              </p>
              <ul className="space-y-1 mb-4">
                {recorder.lastTrace.map((e, i) => (
                  <li key={i} className="font-mono text-[11.5px] text-gray-600">{e.detail ?? e.label}</li>
                ))}
              </ul>
              <p className="text-xs text-gray-400 mb-3">R&eacute;capitulatif &eacute;ditable + envoi du ticket&nbsp;: prochaine &eacute;tape.</p>
              <button onClick={recorder.clearTrace} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50">
                Recommencer
              </button>
            </div>
          ) : (
            <div className="border border-forest-100 bg-forest-50 rounded-xl p-6 text-center">
              <div className="text-3xl mb-1">&#9210;</div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Reproduire le probl&egrave;me</p>
              <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto mb-4">
                Cliquez, refaites l&apos;action qui ne marche pas&nbsp;: on capture la page, vos clics et l&apos;erreur exacte.
              </p>
              <button onClick={recorder.start} className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">
                &#9210; Lancer l&apos;enregistrement
              </button>
            </div>
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
