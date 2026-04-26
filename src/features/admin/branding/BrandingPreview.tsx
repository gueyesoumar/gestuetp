/**
 * BrandingPreview — trois mini-aperçus statiques pour montrer comment
 * la marque blanche rend une fois activée :
 *   - Page de connexion (logo dark sur gradient cabinet)
 *   - Email de relance (header logo light + couleur primaire)
 *   - Sidebar portail client (logo dark + couleur primaire)
 *
 * Lit le draft du formulaire pour rester live, et tombe sur les valeurs
 * sauvegardées (branding) pour les champs non éditables (logos).
 */

import { Mail, Lock } from 'lucide-react'
import type { CabinetBrandingRow } from './useCabinetBrandingAdmin'
import type { BrandingDraft } from './BrandingFormSection'

interface Props {
  cabinetName: string
  branding: CabinetBrandingRow | null
  draft: BrandingDraft
}

const DEFAULT_PRIMARY = '#1B4332'
const DEFAULT_ACCENT = '#D4A843'

export function BrandingPreview({ cabinetName, branding, draft }: Props): JSX.Element {
  const primary = isHex(draft.primary) ? draft.primary : DEFAULT_PRIMARY
  const accent = isHex(draft.accent) ? draft.accent : DEFAULT_ACCENT
  const supportEmail = draft.supportEmail || null
  const fromName = draft.emailFromName || `${cabinetName} via Gëstu`
  const footer = draft.footerText || null
  const logoLight = branding?.logo_light_url ?? null
  const logoDark = branding?.logo_dark_url ?? null

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <header className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-[13px] font-bold text-gray-900">Aperçu</span>
        <span className="text-[10.5px] text-gray-400">Mise à jour en temps réel pendant l&apos;édition</span>
      </header>
      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PreviewLogin cabinetName={cabinetName} primary={primary} logoDark={logoDark} logoLight={logoLight} />
        <PreviewEmail cabinetName={cabinetName} primary={primary} accent={accent} fromName={fromName} supportEmail={supportEmail} footer={footer} logoLight={logoLight} />
        <PreviewSidebar cabinetName={cabinetName} primary={primary} logoDark={logoDark} logoLight={logoLight} />
      </div>
    </div>
  )
}

function PreviewLogin({ cabinetName, primary, logoDark, logoLight }: { cabinetName: string; primary: string; logoDark: string | null; logoLight: string | null }) {
  return (
    <Frame label="Page de connexion">
      <div
        style={{
          background: `linear-gradient(160deg, ${mix(primary, 'black', 0.4)} 0%, ${primary} 60%, ${mix(primary, 'black', 0.2)} 100%)`,
          padding: 16,
          minHeight: 240,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <DualLogoPreview cabinetName={cabinetName} logoDark={logoDark} logoLight={logoLight} height={32} />
        <div style={{ color: 'white', fontWeight: 800, fontSize: 13, marginTop: 8, textAlign: 'center' }}>{cabinetName}</div>
        <div style={{ width: '85%', marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Pill icon="mail" />
          <Pill icon="lock" />
          <div style={{ background: 'white', color: primary, textAlign: 'center', padding: '6px 0', borderRadius: 5, fontSize: 10.5, fontWeight: 700, marginTop: 2 }}>Se connecter</div>
        </div>
        <div style={{ marginTop: 10, fontSize: 8.5, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.4 }}>
          Powered by <span style={{ fontWeight: 600 }}>Gëstu</span>
        </div>
      </div>
    </Frame>
  )
}

function PreviewEmail({ cabinetName, primary, accent, fromName, supportEmail, footer, logoLight }: { cabinetName: string; primary: string; accent: string; fromName: string; supportEmail: string | null; footer: string | null; logoLight: string | null }) {
  return (
    <Frame label="Email">
      <div style={{ background: 'white', minHeight: 240, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#FAFAF8', padding: '6px 10px', fontSize: 9, color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ fontWeight: 700, color: '#1A1A1A', fontSize: 9.5 }}>{fromName}</div>
          <div>noreply@gestugroup.com</div>
        </div>
        <div style={{ background: primary, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          {logoLight ? (
            <span style={{ background: 'white', borderRadius: 4, padding: '3px 5px', display: 'inline-flex' }}>
              <img src={logoLight} alt={cabinetName} style={{ height: 18, maxWidth: 60, width: 'auto' }} />
            </span>
          ) : (
            <span style={{ background: accent, color: primary, borderRadius: 4, width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11 }}>{cabinetName.charAt(0)}</span>
          )}
          <span style={{ color: 'white', fontWeight: 800, fontSize: 11 }}>{cabinetName}</span>
        </div>
        <div style={{ padding: 12, fontSize: 10, color: '#374151', flex: 1, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, color: '#1A1A1A', fontSize: 11, marginBottom: 6 }}>Bonjour Marie,</div>
          <div>Votre auditeur attend un document pour la mission d&apos;audit ISO 27001.</div>
          <div style={{ background: primary, color: 'white', display: 'inline-block', padding: '5px 10px', borderRadius: 4, fontSize: 9.5, fontWeight: 700, marginTop: 8 }}>Déposer le document</div>
        </div>
        <div style={{ background: '#FAFAF8', padding: '8px 12px', borderTop: '1px solid #E5E7EB', fontSize: 8.5, color: '#6B7280', lineHeight: 1.5 }}>
          {supportEmail && <div>Support : <span style={{ color: primary }}>{supportEmail}</span></div>}
          {footer && <div style={{ marginTop: 2 }}>{footer.length > 60 ? `${footer.slice(0, 60)}…` : footer}</div>}
          <div style={{ marginTop: 2, color: '#9CA3AF' }}>{cabinetName} · Powered by Gëstu</div>
        </div>
      </div>
    </Frame>
  )
}

function PreviewSidebar({ cabinetName, primary, logoDark, logoLight }: { cabinetName: string; primary: string; logoDark: string | null; logoLight: string | null }) {
  return (
    <Frame label="Sidebar portail">
      <div style={{ display: 'flex', minHeight: 240 }}>
        <div style={{ background: primary, width: 110, padding: '10px 8px', display: 'flex', flexDirection: 'column', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
            <DualLogoPreview cabinetName={cabinetName} logoDark={logoDark} logoLight={logoLight} height={20} compact />
            <div style={{ fontWeight: 800, fontSize: 9.5, lineHeight: 1.1 }}>{cabinetName.length > 12 ? `${cabinetName.slice(0, 11)}…` : cabinetName}</div>
          </div>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            {['Tableau de bord', 'Mes audits', 'Documents', 'Notifications'].map((label, i) => (
              <div key={label} style={{ padding: '4px 6px', borderRadius: 4, fontSize: 8.5, color: i === 0 ? 'white' : 'rgba(255,255,255,0.55)', background: i === 0 ? 'rgba(255,255,255,0.12)' : 'transparent' }}>{label}</div>
            ))}
          </div>
          <div style={{ paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.15)', fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>
            Powered by <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Gëstu</span>
          </div>
        </div>
        <div style={{ flex: 1, background: '#FAFAF8', padding: 10, fontSize: 9, color: '#6B7280' }}>
          <div style={{ fontWeight: 700, color: '#1A1A1A', fontSize: 10, marginBottom: 6 }}>Mes audits</div>
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 5, padding: 6, marginBottom: 4 }}>
            <div style={{ fontWeight: 600, fontSize: 9, color: '#1A1A1A' }}>ISO 27001 · 2026</div>
            <div style={{ height: 3, background: '#F3F4F6', borderRadius: 2, marginTop: 4 }}>
              <div style={{ height: '100%', background: primary, width: '73%', borderRadius: 2 }} />
            </div>
          </div>
        </div>
      </div>
    </Frame>
  )
}

function DualLogoPreview({ cabinetName, logoDark, logoLight, height, compact }: { cabinetName: string; logoDark: string | null; logoLight: string | null; height: number; compact?: boolean }) {
  if (logoDark) {
    return <img src={logoDark} alt={cabinetName} style={{ height, maxWidth: compact ? 30 : 120, width: 'auto' }} />
  }
  if (logoLight) {
    const pad = Math.round(height * 0.18)
    return (
      <span style={{ background: 'white', borderRadius: Math.round(height * 0.22), padding: `${pad}px ${pad * 1.4}px`, display: 'inline-flex' }}>
        <img src={logoLight} alt={cabinetName} style={{ height: height - pad * 2, maxWidth: compact ? 26 : 100, width: 'auto' }} />
      </span>
    )
  }
  return (
    <span style={{ color: 'white', fontFamily: 'Manrope,sans-serif', fontWeight: 800, fontSize: Math.round(height * 0.7), letterSpacing: -0.5 }}>
      {cabinetName.split(/\s+/).slice(0, 2).map((s) => s.charAt(0).toUpperCase()).join('')}
    </span>
  )
}

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
      <div className="px-2.5 py-1.5 bg-gray-100 border-b border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-600">{label}</div>
      <div>{children}</div>
    </div>
  )
}

function Pill({ icon }: { icon: 'mail' | 'lock' }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 4, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'rgba(255,255,255,0.85)' }}>
      {icon === 'mail' ? <Mail size={9} /> : <Lock size={9} />}
      <span style={{ height: 4, background: 'rgba(255,255,255,0.5)', borderRadius: 1, flex: 1 }} />
    </div>
  )
}

function isHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

/** Mélange deux couleurs hex (mixCol) ratio in [0,1] de la couleur secondaire */
function mix(hex: string, target: 'black' | 'white', ratio: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const t = target === 'black' ? 0 : 255
  const mr = Math.round(r * (1 - ratio) + t * ratio)
  const mg = Math.round(g * (1 - ratio) + t * ratio)
  const mb = Math.round(b * (1 - ratio) + t * ratio)
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(mr)}${toHex(mg)}${toHex(mb)}`
}
