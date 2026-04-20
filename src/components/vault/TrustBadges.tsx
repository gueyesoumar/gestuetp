/**
 * TrustBadges — security trust indicators shown at the bottom of the vault.
 */

import { Lock, Layers, Cpu, Globe } from 'lucide-react'
import type { ReactNode } from 'react'

interface Badge {
  icon: ReactNode
  label: string
}

const BADGES: Badge[] = [
  { icon: <Lock size={14} />, label: 'Chiffrement AES-256' },
  { icon: <Layers size={14} />, label: 'Multi-produits' },
  { icon: <Cpu size={14} />, label: 'IA int\u00e9gr\u00e9e' },
  { icon: <Globe size={14} />, label: 'H\u00e9berg\u00e9 en Europe' },
]

export function TrustBadges(): JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      {BADGES.map((badge) => (
        <div
          key={badge.label}
          className="flex items-center gap-2 text-white/20"
        >
          {badge.icon}
          <span className="text-[10px] font-medium uppercase tracking-wider">
            {badge.label}
          </span>
        </div>
      ))}
    </div>
  )
}
