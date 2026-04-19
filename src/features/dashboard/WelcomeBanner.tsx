interface WelcomeBannerProps {
  name: string
  subtitle: string
}

export function WelcomeBanner({ name, subtitle }: WelcomeBannerProps) {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="rounded-[14px] bg-gradient-to-br from-forest-900 to-forest-700 px-7 py-6 flex items-center justify-between">
      <div>
        <h3 className="text-lg font-bold text-white">Bonjour, {name}</h3>
        <p className="mt-1 text-[13px] text-white/55">{subtitle}</p>
      </div>
      <div className="text-[12px] text-white/40 bg-white/10 px-4 py-1.5 rounded-lg capitalize">
        {today}
      </div>
    </div>
  )
}
