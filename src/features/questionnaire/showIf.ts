import type { ShowIfCondition } from '../../types/database.types'

export function evaluateShowIf(
  condition: ShowIfCondition | null | undefined,
  responses: Map<string, unknown>,
): boolean {
  if (!condition) return true
  const actual = responses.get(condition.question_code)
  switch (condition.operator) {
    case 'equals':
      return actual === condition.value
    case 'not_equals':
      return actual !== condition.value
    case 'truthy':
      return Boolean(actual) && actual !== '' && !(Array.isArray(actual) && actual.length === 0)
    case 'falsy':
      return !actual || actual === '' || (Array.isArray(actual) && actual.length === 0)
    default:
      return true
  }
}

export function describeShowIf(condition: ShowIfCondition | null | undefined): string {
  if (!condition) return ''
  const { question_code, operator, value } = condition
  switch (operator) {
    case 'equals':
      return `affichée si ${question_code} = ${formatVal(value)}`
    case 'not_equals':
      return `affichée si ${question_code} ≠ ${formatVal(value)}`
    case 'truthy':
      return `affichée si ${question_code} renseignée`
    case 'falsy':
      return `affichée si ${question_code} non renseignée`
    default:
      return ''
  }
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '∅'
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non'
  if (typeof v === 'string') return `"${v}"`
  return String(v)
}
