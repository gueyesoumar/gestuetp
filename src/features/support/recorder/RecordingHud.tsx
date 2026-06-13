import { useState, useEffect } from 'react'
import { useRecorder, type RecordedEvent } from './RecorderContext'

const ICON: Record<RecordedEvent['kind'], string> = { click: '🖱', nav: '🧭', error: '⛔' }

export function RecordingHud(): JSX.Element | null {
  const { recording, events, stop, cancel } = useRecorder()
  const [secs, setSecs] = useState(0)

  useEffect(() => {
    if (!recording) { setSecs(0); return }
    const timer = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [recording])

  if (!recording) return null

  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  const recent = events.slice(-4)

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[min(560px,92vw)] bg-[#16110f] text-white rounded-2xl shadow-2xl p-3.5">
      <div className="flex items-center gap-2.5 text-[13px] font-semibold">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        Enregistrement en cours
        <span className="ml-auto font-mono text-[12px] text-gold-500">{mm}:{ss}</span>
        <span className="font-mono text-[11px] text-gray-400">{events.length} étape{events.length > 1 ? 's' : ''}</span>
      </div>

      <div className="mt-2.5 flex flex-col gap-1 max-h-28 overflow-y-auto">
        {recent.length === 0 ? (
          <p className="text-[11px] text-gray-400 font-mono">Refaites l&apos;action qui pose probl&egrave;me&hellip;</p>
        ) : recent.map((e, i) => (
          <div key={i} className={`font-mono text-[11.5px] ${e.kind === 'error' ? 'text-red-300' : 'text-gray-300'}`}>
            {ICON[e.kind]} {e.detail ?? e.label}
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button onClick={cancel} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20">
          Annuler
        </button>
        <button onClick={stop} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-forest-500 hover:bg-forest-700">
          Terminer
        </button>
      </div>
    </div>
  )
}
