import type { ReactNode } from 'react'

interface SplitFormSectionProps {
  title: string
  description?: string
  children: ReactNode
}

export function SplitFormSection({ title, description, children }: SplitFormSectionProps) {
  return (
    <div className="grid grid-cols-[240px_1fr] border-b border-gray-200 last:border-b-0">
      <div className="bg-page-bg border-r border-gray-200 p-6">
        <h4 className="text-[14px] font-semibold text-gray-900">{title}</h4>
        {description && (
          <p className="mt-1 text-[12px] leading-relaxed text-gray-500">{description}</p>
        )}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}
