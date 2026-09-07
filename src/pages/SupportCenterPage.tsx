import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useRecorder } from '../features/support/recorder/RecorderContext'
import { RecordHero } from '../features/support/recorder/RecordHero'
import { BugRecapForm } from '../features/support/recorder/BugRecapForm'
import { DemandeForm } from '../features/support/DemandeForm'
import { SuggestionForm } from '../features/support/SuggestionForm'
import { MySupportRequests } from '../features/support/MySupportRequests'
import { HelpBrowse } from '../features/support/help/HelpBrowse'
import { SupportSidePanel } from '../features/support/help/SupportSidePanel'

type Mode = 'home' | 'bug' | 'demande' | 'suggestion' | 'mine'

export function SupportCenterPage(): JSX.Element {
  const { profile } = useAuth()
  const recorder = useRecorder()
  const [mode, setMode] = useState<Mode>('home')

  // Au retour d'un enregistrement (stop -> navigation vers le centre d'aide), ouvrir le recap.
  useEffect(() => { if (recorder.lastTrace) setMode('bug') }, [recorder.lastTrace])

  if (!profile) return <p className="p-6 text-sm text-gray-400">Chargement&hellip;</p>

  const back = (): void => setMode('home')

  return (
    <div>
      {mode === 'home' && (
        <>
          <h1 className="text-xl font-bold text-gray-900">Centre d&apos;aide</h1>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Trouvez une réponse en quelques secondes &mdash; ou contactez notre équipe.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2">
              <HelpBrowse />
            </div>
            <SupportSidePanel onSelect={setMode} />
          </div>
        </>
      )}

      {mode !== 'home' && (
        <div className="max-w-3xl">
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
      )}
    </div>
  )
}
