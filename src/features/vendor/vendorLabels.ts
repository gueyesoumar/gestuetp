import { VENDOR_DATA_ACCESS_OPTIONS, VENDOR_CRITICALITY_OPTIONS, VENDOR_QUALIFICATION_OPTIONS } from '../../lib/constants'

const labelOf = (opts: readonly { value: string; label: string }[], v: string): string =>
  opts.find((o) => o.value === v)?.label ?? v

export const dataAccessLabel = (v: string): string => labelOf(VENDOR_DATA_ACCESS_OPTIONS, v)
export const criticalityLabel = (v: string): string => labelOf(VENDOR_CRITICALITY_OPTIONS, v)
export const qualificationLabel = (v: string): string => labelOf(VENDOR_QUALIFICATION_OPTIONS, v)

export const QUALIFICATION_STYLE: Record<string, string> = {
  qualifie: 'bg-green-50 text-green-700',
  qualifie_conditions: 'bg-amber-50 text-amber-700',
  en_evaluation: 'bg-blue-50 text-blue-700',
  prospect: 'bg-gray-100 text-gray-500',
  non_qualifie: 'bg-red-50 text-red-600',
  suspendu: 'bg-red-50 text-red-600',
}
