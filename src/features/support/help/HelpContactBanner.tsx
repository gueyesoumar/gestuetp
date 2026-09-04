import { Mail, Clock } from 'lucide-react'
import { SUPPORT_CONTACT } from './helpContent'

/** Bandeau coordonnées + délai de réponse + statut système. */
export function HelpContactBanner(): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <a href={`mailto:${SUPPORT_CONTACT.email}`} className="flex items-center gap-2 text-[12.5px] text-gray-600 hover:text-forest-700">
        <Mail size={16} className="text-forest-600" />
        {SUPPORT_CONTACT.email}
      </a>
      <span className="flex items-center gap-2 text-[12.5px] text-gray-600">
        <Clock size={16} className="text-forest-600" />
        {SUPPORT_CONTACT.responseTime}
      </span>
      <span className="ml-auto flex items-center gap-2 text-[12.5px] text-gray-600">
        <span className="h-2 w-2 rounded-full bg-success ring-2 ring-success/20" />
        Tous les systèmes opérationnels
      </span>
    </div>
  )
}
