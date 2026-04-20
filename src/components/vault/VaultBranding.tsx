/**
 * VaultBranding — "GESTU" title with gold trema + subtitles.
 * Used on login and hub pages.
 */

interface VaultBrandingProps {
  size?: 'md' | 'lg'
}

export function VaultBranding({ size = 'md' }: VaultBrandingProps): JSX.Element {
  const textClass = size === 'lg' ? 'text-[48px]' : 'text-[36px]'
  const dotClass = size === 'lg' ? 'w-[6px] h-[6px]' : 'w-[5px] h-[5px]'
  const dotGap = size === 'lg' ? 'gap-[6px]' : 'gap-[5px]'
  const dotTop = size === 'lg' ? 'top-[3px]' : 'top-[2px]'

  return (
    <div className="flex flex-col items-center">
      <h1
        className={`font-light uppercase tracking-[8px] text-white/90 leading-none ${textClass}`}
      >
        G
        <span className="relative inline-block">
          E
          <span
            className={`absolute left-1/2 -translate-x-1/2 flex ${dotGap} ${dotTop}`}
          >
            <span className={`${dotClass} rounded-full bg-[#D4A843]`} />
            <span className={`${dotClass} rounded-full bg-[#D4A843]`} />
          </span>
        </span>
        STU
      </h1>
      <p
        className="mt-2 text-[13px] font-medium uppercase tracking-[4px] text-[#D4A843]"
      >
        Enterprise Trust Platform
      </p>
      <p className="mt-1 text-[11px] text-white/30">
        Plateforme de confiance num{'\u00e9'}rique
      </p>
    </div>
  )
}
