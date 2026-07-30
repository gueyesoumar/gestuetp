/**
 * HubPage — sélection de produit. Sur le domaine Gëstu, affiche le bouclier
 * morphing + branding Gëstu. Sur un domaine cabinet (audit.auditco.sn), bascule
 * sur le logo cabinet et la signature « Powered by Gëstu » discrète.
 */

import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ChevronRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useBranding } from '../features/branding/useBranding'
import { useComplyHubStats } from '../features/dashboard/useComplyHubStats'
import { BrandedAuthHeader, PoweredByGestu } from '../features/branding/BrandedAuthHeader'
import { VaultBackground } from '../components/vault/VaultBackground'
import { ParticleCanvas } from '../components/vault/ParticleCanvas'
import { FloatingOrbs } from '../components/vault/FloatingOrbs'
import { MorphingShield } from '../components/vault/MorphingShield'
import { VaultBranding } from '../components/vault/VaultBranding'
import { HubUserBar } from '../components/vault/HubUserBar'
import { OrbitCockpit } from '../features/hub/OrbitCockpit'

export function HubPage(): JSX.Element {
  const { profile, signOut } = useAuth()
  const { branding } = useBranding()
  const { stats: complyStats } = useComplyHubStats()
  const navigate = useNavigate()

  const firstName = profile?.first_name ?? 'Utilisateur'
  const isBranded = Boolean(branding)

  return (
    <VaultBackground>
      <ParticleCanvas />
      <FloatingOrbs />

      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center px-4 py-5 md:h-[100dvh] md:overflow-hidden">
        {isBranded ? (
          <div className="mb-3 shrink-0">
            <BrandedAuthHeader layout="hub" />
          </div>
        ) : (
          <div className="mb-2 flex shrink-0 flex-col items-center gap-2">
            <MorphingShield size={56} />
            <VaultBranding size="md" />
          </div>
        )}

        <p className="mb-3 shrink-0 text-center text-[14px] text-white/50">
          Bonjour, {firstName}. Choisissez votre espace.
        </p>

        <div className="flex min-h-0 w-full flex-1 justify-center">
          <OrbitCockpit selfScore={complyStats.conformityScore} />
        </div>

        {/* Carte super-admin — masquée sur les domaines cabinet (les clients ne voient pas l'admin Gëstu) */}
        {!isBranded && profile?.is_platform_owner && (
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="group mt-3 flex shrink-0 items-center gap-3 rounded-full border border-[#D4A843]/30 bg-[#D4A843]/[0.07] px-5 py-2 text-[12.5px] font-semibold text-[#E2C26B] backdrop-blur-sm transition-all hover:border-[#D4A843]/60 hover:bg-[#D4A843]/15 hover:text-[#F2E2B1]"
          >
            <ShieldCheck size={15} strokeWidth={1.7} />
            <span>Console super-admin G&euml;stu</span>
            <span className="rounded-full bg-[#D4A843]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">Owner</span>
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        )}

        {profile && (
          <div className="mt-3 w-full max-w-md shrink-0">
            <HubUserBar profile={profile} onSignOut={signOut} />
          </div>
        )}

        {isBranded && <PoweredByGestu className="mt-3 shrink-0" />}
      </div>
    </VaultBackground>
  )
}
