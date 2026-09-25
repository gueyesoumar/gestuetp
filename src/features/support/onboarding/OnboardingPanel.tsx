import { useEffect, useRef, useState } from 'react'
import { useOnboardingChat } from './useOnboardingChat'
import { OnboardingMessage } from './OnboardingMessage'
import { GestuFingerprint } from './GestuFingerprint'
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
    <div className="flex h-[34rem] max-h-[80vh] w-[23rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[22px] bg-[#F6F7F4] shadow-2xl ring-1 ring-black/5">
      {/* En-tête */}
      <header className="flex items-center gap-3 bg-gradient-to-br from-forest-900 to-forest-700 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-forest-900 shadow-inner">
          <GestuFingerprint size={22} />
        </div>
        <div className="min-w-0 flex-1 text-white">
          <p className="text-[14px] font-bold leading-tight">Doudou <span className="font-medium text-forest-100">de Gëstu</span></p>
          <p className="flex items-center gap-1.5 text-[11.5px] text-forest-100">
            <span className="h-[7px] w-[7px] rounded-full bg-[#57D98A] ring-2 ring-[#57D98A]/30" />
            En ligne · Aide à l&apos;usage
          </p>
        </div>
        <button onClick={onClose} aria-label="Fermer" className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-forest-100 hover:bg-white/20">
          <svg width="15" height="15" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </header>

      {/* Corps */}
      <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3 px-1 py-1">
            <div className="flex items-end gap-2">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-forest-100 text-forest-700"><GestuFingerprint size={14} /></div>
              <div className="max-w-[82%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-[13px] leading-relaxed text-gray-800 ring-1 ring-gray-200">
                Bonjour 👋 Je suis Doudou, votre assistant. Je réponds à vos questions sur l&apos;utilisation de Gëstu. Par où commencer&nbsp;?
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pl-8">
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => submit(ex)} className="rounded-full border border-forest-100 bg-white px-3 py-1.5 text-[12px] font-medium text-forest-700 hover:border-forest-300">
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
            className="flex items-center gap-3 self-start rounded-2xl border border-gold-400 bg-gradient-to-br from-[#FEFBF1] to-[#FAF3DE] px-3 py-2 text-left hover:shadow-md"
          >
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[10px] bg-gold-500 text-forest-900">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </span>
            <span>
              <span className="block text-[12.5px] font-bold text-forest-900">Lancer le tour guidé</span>
              <span className="block text-[11px] text-gold-600">{tourLabel(pendingTour)}</span>
            </span>
          </button>
        )}

        {error && <p className="px-1 text-[12px] text-red-600">{error}</p>}
      </div>

      {/* Saisie */}
      <div className="bg-white p-2.5">
        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-[#F6F7F4] py-1.5 pl-3.5 pr-1.5 focus-within:border-forest-500">
          <input
            id="onboarding-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(input) } }}
            placeholder="Posez votre question…"
            className="flex-1 bg-transparent text-[13px] text-gray-800 outline-none placeholder:text-gray-400"
          />
          <button onClick={() => submit(input)} disabled={streaming || !input.trim()} aria-label="Envoyer" className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-forest-700 to-forest-900 text-white disabled:opacity-40">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 8 6 8-16-8z" fill="currentColor" /></svg>
          </button>
        </div>
        <p className="pt-1.5 text-center text-[10px] tracking-wide text-gray-400">Propulsé par Gëstu · confidentiel</p>
      </div>
    </div>
  )
}
