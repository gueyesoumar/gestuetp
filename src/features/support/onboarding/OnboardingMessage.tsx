import type { ChatMessage } from './useOnboardingChat'
import { LightMarkdown } from './lightMarkdown'
import { GestuFingerprint } from './GestuFingerprint'

// Rendu d'un message. L'assistant (Doudou) est rendu via LightMarkdown (éléments React,
// pas de dangerouslySetInnerHTML — règle sécurité §3) avec un petit avatar empreinte ;
// le message utilisateur reste brut, aligné à droite.
export function OnboardingMessage({ msg, streaming }: { msg: ChatMessage; streaming: boolean }): JSX.Element {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-gradient-to-br from-forest-700 to-forest-900 px-3.5 py-2 text-[13px] leading-relaxed text-white">
          {msg.text}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-forest-100 text-forest-700">
        <GestuFingerprint size={14} />
      </div>
      <div className="max-w-[82%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-[13px] leading-relaxed text-gray-800 ring-1 ring-gray-200">
        {msg.text ? <LightMarkdown text={msg.text} /> : streaming ? <span className="text-gray-400">…</span> : null}
      </div>
    </div>
  )
}
