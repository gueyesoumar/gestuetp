/**
 * VaultBrandPanel — panneau de marque (récit) du login « Split souverain ».
 * Colonne gauche : lockup Gëstu ETP, accroche et badges de confiance souverains.
 * Statique (aucune animation) — cf. audit UX/UI.
 */

import { ShieldCheck, Lock, KeyRound } from 'lucide-react'
import type { ReactNode } from 'react'

const PANEL_BG = 'linear-gradient(160deg, #153528 0%, #1B4332 55%, #0a1a13 100%)'

export function ShieldMark({ size = 30 }: { size?: number }): JSX.Element {
  const h = Math.round(size * 1.17)
  return (
    <svg width={size} height={h} viewBox="0 0 44 52" fill="none" aria-hidden="true">
      <path d="M22 3L4 11V23C4 36.5 22 48 22 48C22 48 40 36.5 40 23V11L22 3Z" fill="none" stroke="#D4A843" strokeWidth="1.6" />
      <path d="M22 16C18 16 15 19 15 23" stroke="#D4A843" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 19C20 19 18 20.5 18 23.5V29" stroke="#D4A843" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 16C26 16 29 19 29 23V27" stroke="#D4A843" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 23V33" stroke="#D4A843" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function Badge({ icon, children }: { icon: ReactNode; children: ReactNode }): JSX.Element {
  return (
    <div className="flex items-center gap-2 text-white/50">
      {icon}
      <span className="text-[11px] font-medium uppercase tracking-wider">{children}</span>
    </div>
  )
}

export function VaultBrandPanel(): JSX.Element {
  return (
    <div
      className="relative hidden w-[56%] max-w-[720px] flex-col justify-between overflow-hidden px-16 py-14 lg:flex"
      style={{ background: PANEL_BG }}
    >
      {/* filigrane bouclier */}
      <svg
        className="pointer-events-none absolute -bottom-28 -right-32 opacity-[0.05]"
        width={520} height={614} viewBox="0 0 44 52" fill="none" aria-hidden="true"
      >
        <path d="M22 3L4 11V23C4 36.5 22 48 22 48C22 48 40 36.5 40 23V11L22 3Z" fill="none" stroke="#D4A843" strokeWidth="0.8" />
        <path d="M22 16C18 16 15 19 15 23" stroke="#D4A843" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M22 19C20 19 18 20.5 18 23.5V29" stroke="#D4A843" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M22 23V33" stroke="#D4A843" strokeWidth="1.2" strokeLinecap="round" />
      </svg>

      {/* lockup Gëstu ETP */}
      <div className="relative flex items-center gap-3">
        <ShieldMark />
        <div className="flex flex-col gap-1">
          <h1 className="text-[20px] font-normal leading-none tracking-[5px] text-white">
            G
            <span className="relative">
              E
              <span className="absolute left-[calc(50%-3px)] -top-1.5 flex -translate-x-1/2 gap-[3px]">
                <i className="block h-[3px] w-[3px] rounded-full bg-[#D4A843]" />
                <i className="block h-[3px] w-[3px] rounded-full bg-[#D4A843]" />
              </span>
            </span>
            STU<span className="ml-1.5 text-[#D4A843]">ETP</span>
          </h1>
          <span className="text-[9.5px] font-semibold uppercase tracking-[2.5px] text-white/50">
            Entreprise Trust Platform
          </span>
        </div>
      </div>

      {/* accroche */}
      <div className="relative max-w-[460px]">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D4A843]/35 px-3 py-1.5">
          <span className="block h-1.5 w-1.5 rounded-full bg-[#D4A843]" />
          <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#D4A843]">
            Confiance Numérique
          </span>
        </div>
        <h2 className="mb-[18px] text-[44px] font-light leading-[1.12] tracking-[-0.5px] text-white">
          La confiance numérique,<br />
          <span className="font-semibold">gouvernée de bout en bout.</span>
        </h2>
        <p className="max-w-[400px] text-[15px] leading-[1.65] text-white/[0.62]">
          Audits multi-référentiels, supervision des assujettis, gestion des risques et des
          incidents — sur une plateforme souveraine, cloisonnée et probante.
        </p>
      </div>

      {/* badges de confiance (souverains) */}
      <div className="relative flex items-center gap-6">
        <Badge icon={<ShieldCheck size={14} strokeWidth={1.6} />}>Hébergement souverain</Badge>
        <Badge icon={<Lock size={14} strokeWidth={1.6} />}>Chiffrement AES-256</Badge>
        <Badge icon={<KeyRound size={14} strokeWidth={1.6} />}>MFA · AAL2</Badge>
      </div>
    </div>
  )
}
