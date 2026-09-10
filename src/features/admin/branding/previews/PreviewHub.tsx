import { type PreviewCtx, mix, accentTextColor } from './previewKit'
import { LogoPreview } from './LogoPreview'

// Aperçu fidèle du Hub adaptatif : top bar (logo + nom + onglets + avatar),
// pastille de confiance, titre, carte produit. Clair pour une surface claire,
// sombre (vault brand) sinon — comme HubPage réel.
export function PreviewHub(p: PreviewCtx): JSX.Element {
  const isLight = p.surfaceMode === 'light'
  const bg = isLight
    ? `linear-gradient(160deg, #FFFFFF 0%, ${mix(p.primary, 'white', 0.92)} 100%)`
    : `linear-gradient(160deg, ${mix(p.primaryDeep, 'black', 0.35)} 0%, ${p.primaryDeep} 100%)`
  const fg = isLight ? '17,24,39' : '255,255,255'
  const ink = `rgb(${fg})`
  const muted = `rgba(${fg},0.55)`
  const faint = `rgba(${fg},0.10)`
  const cardBg = `rgba(${fg},0.05)`

  return (
    <div style={{ background: bg, minHeight: 300, padding: 16, display: 'flex', flexDirection: 'column' }}>
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LogoPreview ctx={p} variant={isLight ? 'light' : 'dark'} height={22} maxWidth={90} />
          <div style={{ width: 1, height: 20, background: faint }} />
          <div>
            <div style={{ color: ink, fontSize: 11, fontWeight: 800, lineHeight: 1 }}>{p.cabinetName.length > 16 ? `${p.cabinetName.slice(0, 15)}…` : p.cabinetName}</div>
            <div style={{ color: muted, fontSize: 7, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>Plateforme d&apos;audit</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ background: p.accent, color: accentTextColor(p.accent), fontSize: 8, fontWeight: 700, padding: '3px 8px', borderRadius: 999 }}>Lanceur</span>
          <span style={{ color: muted, fontSize: 8, fontWeight: 600 }}>Ma posture</span>
          <span style={{ width: 20, height: 20, borderRadius: 999, background: `${p.accent}33`, border: `1px solid ${p.accent}55` }} />
        </div>
      </div>

      {/* centre */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: faint, borderRadius: 999, padding: '3px 10px', fontSize: 8, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: muted }}>
          Confiance <span style={{ background: p.accent, color: accentTextColor(p.accent), padding: '1px 6px', borderRadius: 999 }}>Non évalué</span>
        </span>
        <div style={{ color: ink, fontSize: 17, fontWeight: 300, letterSpacing: -0.4 }}>Votre écosystème de confiance</div>
        <div style={{ width: 150, background: cardBg, border: `1px solid ${faint}`, borderRadius: 10, padding: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: p.primary }} />
          <div style={{ color: ink, fontSize: 11, fontWeight: 700, marginTop: 8 }}>Comply</div>
          <div style={{ color: muted, fontSize: 8.5, marginTop: 2 }}>Conformité &amp; Audit SI</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ color: '#16A34A', fontSize: 7.5, fontWeight: 700, letterSpacing: 0.5 }}>ACTIF</span>
            <span style={{ color: p.accent, fontSize: 7.5, fontWeight: 700 }}>Entrer →</span>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 7.5, color: muted }}>Powered by <span style={{ fontWeight: 600 }}>Gëstu</span></div>
    </div>
  )
}
