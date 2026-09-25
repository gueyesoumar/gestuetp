import type { ChatMessage } from './useOnboardingChat'
import { LightMarkdown } from './lightMarkdown'

// Rendu d'un message. L'assistant est rendu via LightMarkdown (éléments React, pas de
// dangerouslySetInnerHTML — règle sécurité §3) ; le message utilisateur reste brut.
export function OnboardingMessage({ msg, streaming }: { msg: ChatMessage; streaming: boolean }): JSX.Element {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
          isUser ? 'bg-forest-700 text-white' : 'bg-white text-gray-800 ring-1 ring-gray-200'
        }`}
      >
        {isUser
          ? msg.text
          : msg.text
            ? <LightMarkdown text={msg.text} />
            : streaming ? <span className="text-gray-400">…</span> : null}
      </div>
    </div>
  )
}
