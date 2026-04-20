import { Pencil, ArrowRight } from 'lucide-react'

interface NextActionBannerProps {
  label: string
  ctaLabel: string
  onCtaClick: () => void
}

export function NextActionBanner({ label, ctaLabel, onCtaClick }: NextActionBannerProps){
  return (
    <div className="flex items-center justify-between p-4 bg-gold-50 border border-gold-200 rounded-xl mb-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gold-500 text-white flex items-center justify-center text-base shrink-0">
          <Pencil size={18} />
        </div>
        <p className="text-[13px] text-gray-700">
          <strong className="text-gray-900">Prochaine action :</strong> {label}
        </p>
      </div>
      <button
        onClick={onCtaClick}
        className="shrink-0 bg-gold-500 text-forest-900 px-4 py-2 rounded-lg text-[13px] font-semibold hover:bg-gold-600 hover:text-white transition-colors"
      >
        {ctaLabel} <ArrowRight size={14} className="inline" />
      </button>
    </div>
  )
}
