import shieldSvg from '../assets/logo-shield.svg'

type LogoSize = 'xs' | 'sm' | 'md' | 'lg'
type LogoVariant = 'light' | 'dark'
type ProductTag = 'group' | 'comply' | 'risk' | 'privacy' | 'policy'

interface GestuLogoProps {
  size?: LogoSize
  variant?: LogoVariant
  product?: ProductTag
  showTag?: boolean
  className?: string
}

const sizes: Record<LogoSize, { shield: number; text: string; dotSize: string; dotGap: string; dotTop: string; tagSize: string }> = {
  xs: { shield: 20, text: 'text-[17px]', dotSize: 'w-[2.5px] h-[2.5px]', dotGap: 'gap-[2.5px]', dotTop: 'top-[0px]', tagSize: 'text-[8px] tracking-[2px]' },
  sm: { shield: 26, text: 'text-[22px]', dotSize: 'w-[3.5px] h-[3.5px]', dotGap: 'gap-[3px]', dotTop: 'top-[1px]', tagSize: 'text-[9px] tracking-[2px]' },
  md: { shield: 34, text: 'text-[32px]', dotSize: 'w-[5px] h-[5px]', dotGap: 'gap-[4px]', dotTop: 'top-[1px]', tagSize: 'text-[11px] tracking-[3px]' },
  lg: { shield: 46, text: 'text-[42px]', dotSize: 'w-[6px] h-[6px]', dotGap: 'gap-[5px]', dotTop: 'top-[2px]', tagSize: 'text-[11px] tracking-[3px]' },
}

const productColors: Record<ProductTag, string> = {
  group: 'text-gray-400',
  comply: 'text-[#D4A843]',
  risk: 'text-[#E07A5F]',
  privacy: 'text-[#7B68EE]',
  policy: 'text-[#3B82F6]',
}

const productLabels: Record<ProductTag, string> = {
  group: 'GROUP',
  comply: 'COMPLY',
  risk: 'RISK',
  privacy: 'PRIVACY',
  policy: 'POLICY',
}

export function GestuLogo({ size = 'sm', variant = 'light', product = 'comply', showTag = true, className = '' }: GestuLogoProps) {
  const s = sizes[size]
  const textColor = variant === 'dark' ? 'text-white' : 'text-[#1B4332]'
  const tagColor = variant === 'dark' && product === 'group' ? 'text-white/40' : productColors[product]

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={shieldSvg}
        alt="G&euml;stu"
        width={s.shield}
        height={Math.round(s.shield * 1.18)}
        className={variant === 'dark' ? 'brightness-0 invert opacity-80' : ''}
        style={variant === 'dark' ? { filter: 'none' } : undefined}
      />
      <div>
        <div className={`font-extrabold tracking-tight leading-none ${s.text} ${textColor}`}>
          G
          <span className="relative inline-block">
            e
            <span className={`absolute left-1/2 -translate-x-1/2 flex ${s.dotGap} ${s.dotTop}`}>
              <span className={`${s.dotSize} rounded-full bg-[#D4A843]`} />
              <span className={`${s.dotSize} rounded-full bg-[#D4A843]`} />
            </span>
          </span>
          stu
        </div>
        {showTag && (
          <div className={`uppercase font-semibold ${s.tagSize} ${tagColor}`}>
            {productLabels[product]}
          </div>
        )}
      </div>
    </div>
  )
}
