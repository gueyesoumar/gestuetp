import { ShieldCheck, Lock, Mail } from 'lucide-react'
import { type PreviewCtx, mix, accentTextColor } from './previewKit'
import { LogoPreview } from './LogoPreview'

// Aperçu fidèle du login split brandé : panneau récit adaptatif (BrandedBrandPanel)
// + panneau formulaire sombre (brand 900), comme la vraie page de connexion.
export function PreviewLogin(p: PreviewCtx): JSX.Element {
  const isLight = p.surfaceMode === 'light'
  const leftBg = isLight
    ? `linear-gradient(160deg, #FFFFFF 0%, ${p.lightSurface} 100%)`
    : `linear-gradient(160deg, ${mix(p.primary, 'black', 0.18)} 0%, ${p.primary} 55%, ${mix(p.primary, 'black', 0.34)} 100%)`
  const ink = isLight ? '#1A1F1D' : '#FFFFFF'
  const muted = isLight ? 'rgba(17,24,39,0.58)' : 'rgba(255,255,255,0.62)'

  return (
    <div style={{ display: 'flex', minHeight: 300 }}>
      {/* panneau récit (adaptatif) */}
      <div style={{ flex: '0 0 56%', background: leftBg, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <LogoPreview ctx={p} variant={isLight ? 'light' : 'dark'} height={28} maxWidth={140} />
        <div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: `1px solid ${p.accent}66`, borderRadius: 999, padding: '3px 8px' }}>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: p.accent }} />
            <span style={{ color: p.accent, fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Plateforme d&apos;audit</span>
          </span>
          <div style={{ color: ink, fontSize: 22, fontWeight: 300, lineHeight: 1.12, letterSpacing: -0.4, marginTop: 10 }}>{p.cabinetName}</div>
          <div style={{ color: muted, fontSize: 10.5, lineHeight: 1.5, marginTop: 8, maxWidth: 220 }}>
            Audits multi-référentiels, supervision et gestion des risques.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, color: muted, fontSize: 8, fontWeight: 500, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><ShieldCheck size={9} /> Souverain</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Lock size={9} /> AES-256</span>
        </div>
      </div>

      {/* panneau formulaire (sombre, brand 900) */}
      <div style={{ flex: 1, background: p.primaryDeep, padding: '20px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 600, letterSpacing: -0.3 }}>Connexion</div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9.5, marginTop: 3, marginBottom: 12 }}>Accédez à votre espace.</div>
        <Field icon="mail" />
        <Field icon="lock" />
        <div style={{ background: p.accent, color: accentTextColor(p.accent), textAlign: 'center', padding: '7px 0', borderRadius: 6, fontSize: 10, fontWeight: 700, marginTop: 4 }}>Se connecter</div>
        <div style={{ marginTop: 10, fontSize: 8, color: 'rgba(255,255,255,0.32)', textAlign: 'center' }}>
          Powered by <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Gëstu</span>
        </div>
      </div>
    </div>
  )
}

function Field({ icon }: { icon: 'mail' | 'lock' }): JSX.Element {
  return (
    <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 6, padding: '7px 9px', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
      {icon === 'mail' ? <Mail size={10} color="rgba(255,255,255,0.5)" /> : <Lock size={10} color="rgba(255,255,255,0.5)" />}
      <span style={{ height: 4, background: 'rgba(255,255,255,0.35)', borderRadius: 1, flex: 1 }} />
    </div>
  )
}
