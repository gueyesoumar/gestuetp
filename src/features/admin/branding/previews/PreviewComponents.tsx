import { type PreviewCtx, accentTextColor } from './previewKit'

// Aperçu des éléments d'interface affectés par la marque : boutons, badges,
// liens, champ focus, barre de progression, onglet actif — tels qu'ils rendent
// dans l'app (surfaces claires) avec la couleur primaire et l'accent du cabinet.
export function PreviewComponents(p: PreviewCtx): JSX.Element {
  const accentInk = accentTextColor(p.accent)
  return (
    <div style={{ background: '#F7F7F5', minHeight: 360, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Group title="Boutons">
        <button style={btn(p.primary, '#FFFFFF')}>Action principale</button>
        <button style={btn(p.accent, accentInk)}>Accent</button>
        <button style={{ ...btn('#FFFFFF', p.primary), border: `1.5px solid ${p.primary}` }}>Contour</button>
        <button style={{ ...btn('transparent', p.primary), padding: '7px 6px' }}>Lien</button>
      </Group>

      <Group title="Badges &amp; statuts">
        <span style={pill(p.accent, accentInk)}>Premium</span>
        <span style={pill('#DCFCE7', '#166534')}>Actif</span>
        <span style={pill('#FEF3C7', '#92400E')}>En attente</span>
        <span style={{ ...pill(`${p.primary}14`, p.primary), border: `1px solid ${p.primary}33` }}>Étiquette</span>
      </Group>

      <Group title="Champs &amp; navigation">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input readOnly value="Saisie…" style={{ fontSize: 11, padding: '7px 10px', borderRadius: 7, border: `1.5px solid ${p.primary}`, outline: 'none', background: 'white', color: '#374151', boxShadow: `0 0 0 3px ${p.primary}22`, width: 150 }} />
          <a href="#" onClick={(e) => e.preventDefault()} style={{ color: p.accent, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>Voir le détail →</a>
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: p.primary, borderBottom: `2px solid ${p.primary}`, paddingBottom: 3 }}>Onglet actif</span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: '#9CA3AF', paddingBottom: 3 }}>Onglet</span>
          </div>
        </div>
      </Group>

      <Group title="Progression">
        <div style={{ width: '100%', maxWidth: 320 }}>
          <div style={{ height: 7, background: '#E5E7EB', borderRadius: 999 }}>
            <div style={{ height: '100%', width: '68%', background: p.primary, borderRadius: 999 }} />
          </div>
          <div style={{ fontSize: 9.5, color: '#6B7280', marginTop: 4 }}>Score de conformité — <span style={{ color: p.primary, fontWeight: 700 }}>68%</span></div>
        </div>
      </Group>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

function btn(bg: string, ink: string): React.CSSProperties {
  return { background: bg, color: ink, border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'default' }
}

function pill(bg: string, ink: string): React.CSSProperties {
  return { background: bg, color: ink, borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 700 }
}
