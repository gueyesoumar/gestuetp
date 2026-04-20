interface ScopingClientContextProps {
  icon: React.ReactNode
  title: string
  description?: string
  tags?: { label: string; variant?: 'default' | 'reg' | 'risk' }[]
  children?: React.ReactNode
}

export function ScopingClientContext({ icon, title, description, tags, children }: ScopingClientContextProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl mx-4 mb-3 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
        <span className="text-base">{icon}</span>
        <span className="text-[13px] font-semibold text-gray-900">{title}</span>
      </div>
      {description && (
        <div className="px-4 py-3 text-xs text-gray-700 leading-relaxed">{description}</div>
      )}
      {children}
      {tags && tags.length > 0 && (
        <div className="flex gap-1 flex-wrap px-4 pb-3">
          {tags.map((tag) => (
            <span key={tag.label} className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
              tag.variant === 'reg' ? 'bg-gold-50 text-gold-600' :
              tag.variant === 'risk' ? 'bg-red-50 text-red-600' :
              'bg-gray-100 text-gray-500'
            }`}>
              {tag.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
