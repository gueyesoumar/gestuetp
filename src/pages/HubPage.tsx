/**
 * HubPage — product selection hub for Gestu ETP.
 * Shows all 6 products with only Comply active.
 */

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
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
  const navigate = useNavigate()

  const firstName = profile?.first_name ?? 'Utilisateur'

  return (
    <VaultBackground>
      <ParticleCanvas />
      <FloatingOrbs />

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-12">
        {/* Branding */}
        <div className="mb-6">
          <MorphingShield size={80} />
        </div>
        <div className="mb-10">
          <VaultBranding size="lg" />
        </div>

        {/* Greeting */}
        <p className="mb-10 text-center text-[15px] text-white/50">
          Bonjour, {firstName}. Choisissez votre espace.
        </p>

        {/* Product grid */}
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* User bar */}
        {profile && (
          <div className="mt-12 w-full max-w-md">
            <HubUserBar profile={profile} onSignOut={signOut} />
          </div>
        )}
      </div>
    </VaultBackground>
  )
}
