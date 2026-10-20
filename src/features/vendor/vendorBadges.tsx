import { qualificationLabel, criticalityLabel, QUALIFICATION_STYLE } from './vendorLabels'

export function QualificationBadge({ status }: { status: string }): JSX.Element {
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${QUALIFICATION_STYLE[status] ?? 'bg-gray-100 text-gray-500'}`}>{qualificationLabel(status)}</span>
}

export function CriticalityBadge({ value }: { value: string }): JSX.Element {
  const hot = value === 'eleve'
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${hot ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{criticalityLabel(value)}</span>
}
