import type { ChatMessage } from './useOnboardingChat'

// Rendu d'un message. Le texte assistant est affiché tel quel (whitespace-pre-wrap) —
// pas de dangerouslySetInnerHTML (règle sécurité §3 : échappement React).
export function OnboardingMessage({ msg, streaming }: { msg: ChatMessage; streaming: boolean }): JSX.Element {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
          isUser ? 'bg-forest-700 text-white' : 'bg-white text-gray-800 ring-1 ring-gray-200'
        }`}
      >
        {msg.text || (streaming ? <span className="text-gray-400">…</span> : null)}
      </div>
    </div>
  )
}
