import type { Notification } from '../../types/database.types'

export interface NotifGroup { label: string; items: Notification[] }

const startOfDay = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/**
 * Regroupe les notifications par ancienneté (sur `created_at`) : Aujourd'hui /
 * Cette semaine (7 jours glissants) / Plus ancien. Les groupes vides sont omis.
 * Purement client-side, sur la liste déjà chargée.
 */
export function groupNotificationsByAge(items: Notification[]): NotifGroup[] {
  const todayStart = startOfDay(new Date())
  const weekStart = todayStart - 6 * 86_400_000
  const today: Notification[] = []
  const week: Notification[] = []
  const older: Notification[] = []
  for (const n of items) {
    const t = new Date(n.created_at).getTime()
    if (t >= todayStart) today.push(n)
    else if (t >= weekStart) week.push(n)
    else older.push(n)
  }
  return [
    { label: "Aujourd'hui", items: today },
    { label: 'Cette semaine', items: week },
    { label: 'Plus ancien', items: older },
  ].filter((g) => g.items.length > 0)
}
