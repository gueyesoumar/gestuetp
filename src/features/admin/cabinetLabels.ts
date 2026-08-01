export function labelOrganizationType(types: string[]): string {
  if (types.includes('cabinet') && types.includes('group')) return 'Cabinet · Groupe'
  if (types.includes('cabinet') && types.includes('client')) return 'Cabinet · Client'
  if (types.includes('cabinet')) return 'Cabinet'
  if (types.includes('client')) return 'Client'
  if (types.includes('group')) return 'Groupe'
  if (types.includes('platform')) return 'Plateforme'
  return 'Organisation'
}
