import type { PreviewCtx } from './previewKit'

// Logo adaptatif d'aperçu — reproduit la logique de src/features/branding/Logo.tsx :
// variant light → logo clair tel quel ; variant dark → logo sombre sinon
// traitement (direct/blanchi/pastille) sur le logo clair.
export function LogoPreview({ ctx, variant, height, maxWidth = 130 }: {
  ctx: PreviewCtx
  variant: 'light' | 'dark'
  height: number
  maxWidth?: number
}): JSX.Element {
  const { cabinetName, logoLight, logoDark, treatment } = ctx
  const base = { height, maxWidth, width: 'auto' as const, display: 'block' as const }

  if (variant === 'light') {
    if (logoLight) return <img src={logoLight} alt={cabinetName} style={base} />
    return <Initials name={cabinetName} height={height} ink="#1A1F1D" />
  }
  if (logoDark) return <img src={logoDark} alt={cabinetName} style={base} />
  if (logoLight) {
    if (treatment === 'direct') return <img src={logoLight} alt={cabinetName} style={base} />
    if (treatment === 'whiten') return <img src={logoLight} alt={cabinetName} style={{ ...base, filter: 'brightness(0) invert(1)' }} />
    const pad = Math.round(height * 0.18)
    return (
      <span style={{ background: 'white', borderRadius: Math.round(height * 0.22), padding: `${pad}px ${pad * 1.4}px`, display: 'inline-flex' }}>
        <img src={logoLight} alt={cabinetName} style={{ height: height - pad * 2, maxWidth: maxWidth - 20, width: 'auto', display: 'block' }} />
      </span>
    )
  }
  return <Initials name={cabinetName} height={height} ink="white" />
}

function Initials({ name, height, ink }: { name: string; height: number; ink: string }): JSX.Element {
  const initials = name.split(/\s+/).slice(0, 2).map((s) => s.charAt(0).toUpperCase()).join('')
  return (
    <span style={{ color: ink, fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: Math.round(height * 0.7), letterSpacing: -0.5 }}>
      {initials}
    </span>
  )
}
