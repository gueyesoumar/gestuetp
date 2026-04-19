interface WizardProgressProps {
  currentStep: number
  totalSteps: number
  sections: { label: string; count: number }[]
  currentSection: number
}

export function WizardProgress({ currentStep, totalSteps, sections, currentSection }: WizardProgressProps) {
  const pct = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0

  return (
    <div className="px-6 py-4 border-b border-gray-200 bg-[#FAFAFA]">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-1 bg-gray-200 rounded-full">
          <div className="h-1 bg-forest-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-semibold text-forest-700 min-w-[40px] text-right">{currentStep}/{totalSteps}</span>
      </div>
      <div className="flex gap-1">
        {sections.map((section, i) => (
          <div key={i} className={`h-[3px] flex-1 rounded-full transition-all ${
            i < currentSection ? 'bg-green-500' : i === currentSection ? 'bg-forest-500' : 'bg-gray-200'
          }`} title={section.label} />
        ))}
      </div>
    </div>
  )
}
