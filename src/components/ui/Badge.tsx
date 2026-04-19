const variants = {
  forest: 'bg-forest-100 text-forest-700',
  gold: 'bg-gold-200 text-gold-600',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-600',
  blue: 'bg-forest-100 text-forest-700',
} as const

type BadgeVariant = keyof typeof variants

export function Badge({ label, variant = 'gray' }: { label: string; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${variants[variant]}`}>
      {label}
    </span>
  )
}
