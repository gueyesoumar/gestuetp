/**
 * HubPage — sélection de produit. Sur le domaine Gëstu, affiche le bouclier
 * morphing + branding Gëstu. Sur un domaine cabinet (audit.auditco.sn), bascule
 * sur le logo cabinet et la signature « Powered by Gëstu » discrète.
 */

import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ChevronRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useBranding } from '../features/branding/useBranding'
import { BrandedAuthHeader, PoweredByGestu } from '../features/branding/BrandedAuthHeader'
import { VaultBackground } from '../components/vault/VaultBackground'
import { ParticleCanvas } from '../components/vault/ParticleCanvas'
import { FloatingOrbs } from '../components/vault/FloatingOrbs'
import { MorphingShield } from '../components/vault/MorphingShield'
import { VaultBranding } from '../components/vault/VaultBranding'
import { ProductCard } from '../components/vault/ProductCard'
import { HubUserBar } from '../components/vault/HubUserBar'
import { HUB_PRODUCTS } from '../lib/hubProducts'

export function HubPage(): JSX.Element {
  const { profile, signOut } = useAuth()
  const { branding } = useBranding()
  const navigate = useNavigate()

  const firstName = profile?.first_name ?? 'Utilisateur'
  const isBranded = Boolean(branding)

  return (
    <VaultBackground>
      <ParticleCanvas />
      <FloatingOrbs />

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-12">
        {isBranded ? (
          <div className="mb-10">
            <BrandedAuthHeader layout="hub" />
          </div>
        ) : (
          <>
            <div className="mb-6">
              <MorphingShield size={80} />
            </div>
            <div className="mb-10">
              <VaultBranding size="lg" />
            </div>
          </>
        )}

        <p className="mb-10 text-center text-[15px] text-white/50">
          Bonjour, {firstName}. Choisissez votre espace.
        </p>

        <div className="grid w-full max-w-[1040px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {HUB_PRODUCTS.map((product, i) => (
            <div key={product.name} className="flex justify-center">
              <ProductCard
                name={product.name}
                title={product.title}
                description={product.description}
                color={product.color}
                active={product.active}
                badge={product.badge}
                stats={product.stats}
                delay={i * 100}
                onClick={product.active ? () => navigate('/') : undefined}
              />
            </div>
          ))}
        </div>

        {/* Carte super-admin — masquée sur les domaines cabinet (les clients ne voient pas l'admin Gëstu) */}
        {!isBranded && profile?.is_platform_owner && (
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="group mt-10 flex items-center gap-3 rounded-full border border-[#D4A843]/30 bg-[#D4A843]/[0.07] px-5 py-2.5 text-[12.5px] font-semibold text-[#E2C26B] backdrop-blur-sm transition-all hover:border-[#D4A843]/60 hover:bg-[#D4A843]/15 hover:text-[#F2E2B1]"
          >
            <ShieldCheck size={15} strokeWidth={1.7} />
            <span>Console super-admin G&euml;stu</span>
            <span className="rounded-full bg-[#D4A843]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">Owner</span>
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        )}

        <div className="flex-1" />

        {profile && (
          <div className="mt-12 w-full max-w-md">
            <HubUserBar profile={profile} onSignOut={signOut} />
          </div>
        )}

        {isBranded && <PoweredByGestu className="mt-6" />}
      </div>
    </VaultBackground>
  )
}
