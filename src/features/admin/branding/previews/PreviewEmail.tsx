import { type PreviewCtx, accentTextColor } from './previewKit'

// Aperçu e-mail de relance : en-tête à la couleur primaire + logo (pastille
// blanche pour rester lisible sur fond coloré, comme le header e-mail réel).
export function PreviewEmail(p: PreviewCtx & { fromName: string; supportEmail: string | null; footer: string | null }): JSX.Element {
  return (
    <div style={{ background: 'white', minHeight: 300, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#FAFAF8', padding: '8px 12px', fontSize: 10, color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ fontWeight: 700, color: '#1A1A1A', fontSize: 10.5 }}>{p.fromName}</div>
        <div>noreply@gestugroup.com</div>
      </div>
      <div style={{ background: p.primary, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
        {p.logoLight ? (
          <span style={{ background: 'white', borderRadius: 5, padding: '4px 6px', display: 'inline-flex' }}>
            <img src={p.logoLight} alt={p.cabinetName} style={{ height: 20, maxWidth: 70, width: 'auto', display: 'block' }} />
          </span>
        ) : (
          <span style={{ background: p.accent, color: accentTextColor(p.accent), borderRadius: 5, width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>{p.cabinetName.charAt(0)}</span>
        )}
        <span style={{ color: 'white', fontWeight: 800, fontSize: 12 }}>{p.cabinetName}</span>
      </div>
      <div style={{ padding: 14, fontSize: 11, color: '#374151', flex: 1, lineHeight: 1.5 }}>
        <div style={{ fontWeight: 700, color: '#1A1A1A', fontSize: 12, marginBottom: 6 }}>Bonjour Marie,</div>
        <div>Votre auditeur attend un document pour la mission d&apos;audit ISO 27001.</div>
        <div style={{ background: p.primary, color: 'white', display: 'inline-block', padding: '6px 12px', borderRadius: 5, fontSize: 10, fontWeight: 700, marginTop: 10 }}>Déposer le document</div>
      </div>
      <div style={{ background: '#FAFAF8', padding: '9px 14px', borderTop: '1px solid #E5E7EB', fontSize: 9, color: '#6B7280', lineHeight: 1.5 }}>
        {p.supportEmail && <div>Support : <span style={{ color: p.primary }}>{p.supportEmail}</span></div>}
        {p.footer && <div style={{ marginTop: 2 }}>{p.footer.length > 64 ? `${p.footer.slice(0, 64)}…` : p.footer}</div>}
        <div style={{ marginTop: 2, color: '#9CA3AF' }}>{p.cabinetName} · Powered by Gëstu</div>
      </div>
    </div>
  )
}
