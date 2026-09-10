import type { PreviewCtx } from './previewKit'
import { LogoPreview } from './LogoPreview'

// Aperçu portail client : sidebar à la couleur primaire (logo dark adaptatif)
// + zone de contenu claire, comme le portail réel.
export function PreviewPortal(p: PreviewCtx): JSX.Element {
  const nav = ['Tableau de bord', 'Mes audits', 'Documents', 'Notifications']
  return (
    <div style={{ display: 'flex', minHeight: 300 }}>
      <div style={{ background: p.primaryDeep, width: 128, padding: '12px 10px', display: 'flex', flexDirection: 'column', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingBottom: 9, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
          <LogoPreview ctx={p} variant="dark" height={20} maxWidth={34} />
          <div style={{ fontWeight: 800, fontSize: 9.5, lineHeight: 1.1 }}>{p.cabinetName.length > 12 ? `${p.cabinetName.slice(0, 11)}…` : p.cabinetName}</div>
        </div>
        <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {nav.map((label, i) => (
            <div key={label} style={{ padding: '5px 7px', borderRadius: 5, fontSize: 9, color: i === 0 ? 'white' : 'rgba(255,255,255,0.55)', background: i === 0 ? 'rgba(255,255,255,0.12)' : 'transparent' }}>{label}</div>
          ))}
        </div>
        <div style={{ paddingTop: 7, borderTop: '1px solid rgba(255,255,255,0.15)', fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>
          Powered by <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Gëstu</span>
        </div>
      </div>
      <div style={{ flex: 1, background: '#FAFAF8', padding: 12, fontSize: 10, color: '#6B7280' }}>
        <div style={{ fontWeight: 700, color: '#1A1A1A', fontSize: 11, marginBottom: 8 }}>Mes audits</div>
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 6, padding: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 10, color: '#1A1A1A' }}>ISO 27001 · 2026</div>
          <div style={{ height: 3, background: '#F3F4F6', borderRadius: 2, marginTop: 5 }}>
            <div style={{ height: '100%', background: p.primary, width: '73%', borderRadius: 2 }} />
          </div>
        </div>
      </div>
    </div>
  )
}
