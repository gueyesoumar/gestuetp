import { Mail, Clock } from 'lucide-react'
import { SUPPORT_CONTACT } from './helpContent'

/** Coordonnées + délai de réponse + statut système (format vertical, pour le rail). */
export function HelpContactBanner(): JSX.Element {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2.5">
      <a href={`mailto:${SUPPORT_CONTACT.email}`} className="flex items-center gap-2.5 text-[12.5px] text-gray-600 hover:text-forest-700">
        <Mail size={16} className="text-forest-600 flex-shrink-0" />
        {SUPPORT_CONTACT.email}
      </a>
      <span className="flex items-center gap-2.5 text-[12.5px] text-gray-600">
        <Clock size={16} className="text-forest-600 flex-shrink-0" />
        {SUPPORT_CONTACT.responseTime}
      </span>
      <span className="flex items-center gap-2.5 text-[12.5px] text-gray-600">
        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-success ring-2 ring-success/20" />
        Tous les systèmes opérationnels
      </span>
    </div>
  )
}
