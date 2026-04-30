export const CLIENT_TABS = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'exchanges', label: '\u00c9changes' },
  { key: 'results', label: 'R\u00e9sultats' },
  { key: 'action_plan', label: 'Plan d\u2019action' },
  { key: 'reports', label: 'Rapports' },
] as const

export type ClientTabKey = typeof CLIENT_TABS[number]['key']

export const PERMISSION_LABELS: Record<string, string> = {
  approver: 'Approbateur',
  contributor: 'Contributeur',
  viewer: 'Lecteur',
}

export const ACTION_PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critique', color: 'text-red-600 bg-red-50' },
  high: { label: '\u00c9lev\u00e9e', color: 'text-orange-600 bg-orange-50' },
  medium: { label: 'Mod\u00e9r\u00e9e', color: 'text-amber-600 bg-amber-50' },
  low: { label: 'Faible', color: 'text-gray-500 bg-gray-50' },
}

export const ACTION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: '\u00c0 faire', color: 'text-amber-600 bg-amber-50' },
  in_progress: { label: 'En cours', color: 'text-blue-600 bg-blue-50' },
  done: { label: 'Fait', color: 'text-green-600 bg-green-50' },
}

export const CLIENT_NAV_ITEMS = [
  { key: 'dashboard', label: 'Tableau de bord', icon: '\u2630' },
  { key: 'missions', label: 'Mes missions', icon: '\ud83d\udccb' },
  { key: 'documents', label: 'Documents', icon: '\ud83d\udcce' },
  { key: 'validations', label: 'Validations', icon: '\u2713' },
  { key: 'notifications', label: 'Notifications', icon: '\ud83d\udd14' },
] as const

export type ClientNavKey = typeof CLIENT_NAV_ITEMS[number]['key']
