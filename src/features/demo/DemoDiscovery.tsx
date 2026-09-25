import { Check, X } from 'lucide-react'
import { useDemoDiscovery } from './useDemoDiscovery'
import { GestuFingerprint } from '../support/onboarding/GestuFingerprint'

// Panneau « Parcours de découverte » (RFC 0011 · Lot C). Liste les étapes guidées ;
// chaque « Découvrir » lance le tour correspondant (moteur onboarding) sur les données
// de démo et marque l'étape vue. Doudou en fil rouge.
export function DemoDiscovery({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element | null {
  const { steps, seen, doneCount, total, markSeen } = useDemoDiscovery()
  if (!open) return null

  const current = steps.findIndex((s) => !seen.has(s.id))
  const pct = total ? Math.round((doneCount / total) * 100) : 0

  const launch = (id: string): void => {
    void markSeen(id)
    onClose()
    window.dispatchEvent(new CustomEvent('onboarding:tour', { detail: id }))
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-forest-900/50 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-[34rem] max-w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 bg-gradient-to-br from-forest-900 to-forest-700 px-5 py-4 text-white">
          <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-forest-900"><GestuFingerprint size={22} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-tight">Parcours de découverte</p>
            <p className="text-[12px] text-forest-100">Guidé par Doudou · sur vos données d&apos;exemple</p>
          </div>
          <div className="text-right">
            <div className="mono text-[12px] font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{doneCount} / {total}</div>
            <div className="mt-1 h-[5px] w-20 overflow-hidden rounded-full bg-white/20"><span className="block h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} /></div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-white/10 text-forest-100 hover:bg-white/20"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {steps.map((s, i) => {
            const done = seen.has(s.id)
            const isCurrent = i === current
            return (
              <div key={s.id} className={`flex items-center gap-3 rounded-xl p-3 ${isCurrent ? 'bg-forest-50' : ''}`}>
                <span className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-[12px] font-bold ${done ? 'bg-forest-500 text-white' : isCurrent ? 'bg-gold-500 text-forest-900' : 'bg-gray-100 text-gray-400'}`}>
                  {done ? <Check size={14} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13.5px] font-semibold ${done || isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>{s.title}</span>
                  <span className="block text-[12px] text-gray-500">{s.desc}</span>
                </span>
                <button
                  onClick={() => launch(s.id)}
                  className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold ${done ? 'border border-gray-200 text-forest-700 hover:bg-forest-50' : 'bg-gradient-to-br from-forest-700 to-forest-900 text-white'}`}
                >
                  {done ? 'Revoir' : 'Découvrir'}
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-2.5 border-t border-gray-100 bg-[#FBFAF6] px-5 py-3 text-[12px] text-gray-500">
          <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-forest-100 text-forest-700"><GestuFingerprint size={13} /></span>
          Doudou vous accompagne à chaque étape — posez-lui une question quand vous voulez.
        </div>
      </div>
    </div>
  )
}
