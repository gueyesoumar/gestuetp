// Empreinte du logo Gëstu (extraite de assets/logo-shield.svg, sans le bouclier).
// Couleur pilotée par `currentColor` → or sur fond forêt, forêt sur fond or.
export function GestuFingerprint({ size = 24, className = '' }: { size?: number; className?: string }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="10 11 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M22 16C18 16 15 19 15 23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M22 13C16 13 12 17.5 12 23.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <path d="M22 19C20 19 18 20.5 18 23.5V29" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M22 16C26 16 29 19 29 23V27" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M22 13C28 13 32 17.5 32 23.5V25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <path d="M22 23V33" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M26 23V31" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}
