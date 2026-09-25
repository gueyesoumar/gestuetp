import { useEffect, useRef, useState } from 'react'
import { useOnboardingChat } from './useOnboardingChat'
import { OnboardingMessage } from './OnboardingMessage'
import { tourLabel, launchTour } from './tours'

const EXAMPLES = ['Comment créer une mission ?', 'Où configurer le 2FA ?', 'Comment inviter un membre ?']

interface Props { route: string; module: string; onClose: () => void }

export function OnboardingPanel({ route, module, onClose }: Props): JSX.Element {
  const { messages, streaming, pendingTour, error, send, clearTour } = useOnboardingChat()
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const submit = (text: string): void => {
    if (!text.trim() || streaming) return
    void send(text, { route, module })
    setInput('')
  }

  return (
    <div className="flex h-[32rem] max-h-[80vh] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-page-bg shadow-2xl ring-1 ring-gray-200">
      <header className="flex items-center justify-between bg-forest-900 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-lg">🧭</span>
          <div>
            <p className="text-[13px] font-semibold leading-tight">{"Assistant d'onboarding"}</p>
            <p className="text-[11px] leading-tight text-forest-100">Aide à l&apos;usage de la plateforme</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-forest-100 hover:bg-forest-700 hover:text-white">✕</button>
      </header>

      <div ref={listRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3 px-1 py-2">
            <p className="text-[13px] text-gray-600">
              {"Posez une question sur l'utilisation de Gëstu — je réponds à partir de l'aide de la plateforme."}
            </p>
            <div className="flex flex-col gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => submit(ex)}
                  className="rounded-lg bg-white px-3 py-2 text-left text-[12.5px] text-forest-700 ring-1 ring-gray-200 hover:ring-forest-300"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => <OnboardingMessage key={i} msg={m} streaming={streaming && i === messages.length - 1} />)
        )}

        {pendingTour && (
          <button
            onClick={() => { launchTour(pendingTour); clearTour() }}
            className="mt-1 self-start rounded-lg bg-gold-500 px-3 py-2 text-[12.5px] font-semibold text-forest-900 hover:bg-gold-400"
          >
            ▶ {tourLabel(pendingTour)}
          </button>
        )}

        {error && <p className="px-1 text-[12px] text-red-600">{error}</p>}
      </div>

      <div className="border-t border-gray-200 bg-white p-2">
        <div className="flex items-end gap-2">
          <textarea
            id="onboarding-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input) } }}
            rows={1}
            placeholder="Votre question…"
            className="max-h-24 flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-forest-500 focus:outline-none"
          />
          <button
            onClick={() => submit(input)}
            disabled={streaming || !input.trim()}
            className="rounded-lg bg-forest-700 px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            {streaming ? '…' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  )
}
