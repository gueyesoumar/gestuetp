import { FileText, CheckCircle2, XCircle, MessageSquare, Flag, UserPlus, LifeBuoy, ClipboardCheck, Briefcase, ListChecks, Eye, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { NotificationType } from '../../types/database.types'

/** Différenciation visuelle par type : icône + tonalité (couleur). Source unique
 * partagée par la page et (à terme) le dropdown cloche. */
type Tone = 'green' | 'red' | 'amber' | 'gold' | 'forest' | 'gray'

export const NOTIF_TONE: Record<Tone, string> = {
  green: 'bg-green-50 text-green-700',
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-700',
  gold: 'bg-gold-50 text-gold-600',
  forest: 'bg-forest-50 text-forest-700',
  gray: 'bg-gray-100 text-gray-500',
}

export interface NotifTypeConfig { label: string; tone: Tone; Icon: LucideIcon }

const CONFIG: Record<NotificationType, NotifTypeConfig> = {
  submission: { label: 'Soumission', tone: 'green', Icon: FileText },
  approval: { label: 'Approbation', tone: 'green', Icon: CheckCircle2 },
  rejection: { label: 'Rejet', tone: 'red', Icon: XCircle },
  client_response: { label: 'Réponse client', tone: 'gold', Icon: MessageSquare },
  mission_closure: { label: 'Clôture', tone: 'green', Icon: Flag },
  invitation: { label: 'Invitation', tone: 'forest', Icon: UserPlus },
  support: { label: 'Support', tone: 'gold', Icon: LifeBuoy },
  client_review: { label: 'Validation client', tone: 'gold', Icon: ClipboardCheck },
  mission_assigned: { label: 'Affectation', tone: 'forest', Icon: Briefcase },
  car: { label: 'Action corrective', tone: 'gold', Icon: ListChecks },
  admin_view: { label: 'Consultation', tone: 'gray', Icon: Eye },
  review_due: { label: 'Revue', tone: 'amber', Icon: Clock },
}

const FALLBACK: NotifTypeConfig = { label: 'Notification', tone: 'gray', Icon: FileText }

export const notifConfig = (t: NotificationType): NotifTypeConfig => CONFIG[t] ?? FALLBACK
