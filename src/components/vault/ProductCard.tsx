/**
 * ProductCard — a single product tile for the Hub grid.
 */

import { Shield, ChevronRight } from 'lucide-react'

interface ProductStat {
  label: string
  value: string
}

interface ProductCardProps {
  name: string
  title: string
  description: string
  color: string
  active: boolean
  badge: string
  stats: ProductStat[]
  delay: number
  onClick?: () => void
}

export function ProductCard({
  name,
  title,
  description,
  color,
  active,
  badge,
  stats,
  delay,
  onClick,
}: ProductCardProps): JSX.Element {
  const isClickable = active && onClick !== undefined

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={isClickable ? onClick : undefined}
      className="group relative w-full max-w-[320px] rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-left transition-all duration-300 backdrop-blur-sm disabled:cursor-default"
      style={{
        animation: `slideUp 0.5s ease-out ${delay}ms both`,
        opacity: active ? 1 : 0.25,
      }}
      onMouseEnter={(e) => {
        if (!isClickable) return
        const el = e.currentTarget
        el.style.transform = 'translateY(-4px) scale(1.02)'
        el.style.boxShadow = `0 8px 32px ${color}20`
        el.style.borderColor = `${color}40`
      }}
      onMouseLeave={(e) => {
        if (!isClickable) return
        const el = e.currentTarget
        el.style.transform = ''
        el.style.boxShadow = ''
        el.style.borderColor = ''
      }}
    >
      <div className="mb-4 flex items-center gap-3">
        <Shield size={24} style={{ color }} />
        <span
          className="text-[11px] font-semibold uppercase tracking-[2px]"
          style={{ color }}
        >
          {name}
        </span>
      </div>

      <h3 className="mb-1 text-[15px] font-semibold text-white/90">{title}</h3>
      <p className="mb-4 text-[12px] leading-relaxed text-white/35">{description}</p>

      {stats.length > 0 && (
        <div className="mb-4 flex gap-4">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-[16px] font-bold text-white/80">{s.value}</p>
              <p className="text-[10px] text-white/30">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span
          className="rounded-full px-3 py-1 text-[10px] font-semibold"
          style={{
            background: active ? `${color}15` : 'rgba(255,255,255,0.05)',
            color: active ? color : 'rgba(255,255,255,0.25)',
          }}
        >
          {badge}
        </span>
        {isClickable && (
          <ChevronRight
            size={16}
            className="text-white/20 transition-colors group-hover:text-white/50"
          />
        )}
      </div>
    </button>
  )
}
