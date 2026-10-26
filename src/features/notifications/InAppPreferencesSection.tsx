import { useNotificationPreferences } from './useNotificationPreferences'
import type { NotificationType } from '../../types/database.types'

interface Props {
  userId: string
}

// Types masquables par l'utilisateur (admin_view / support restent toujours délivrés).
const CONFIGURABLE: { type: NotificationType; label: string; description: string }[] = [
  { type: 'mission_assigned', label: 'Affectations', description: 'Quand on vous ajoute à une mission.' },
  { type: 'submission', label: 'Évaluations à relire', description: 'Quand une évaluation est soumise pour votre relecture.' },
  { type: 'approval', label: 'Validations', description: 'Quand une de vos évaluations est validée.' },
  { type: 'rejection', label: 'Rejets', description: 'Quand une de vos évaluations est rejetée.' },
  { type: 'client_review', label: 'Validations client à faire', description: 'Quand des contrôles vous sont transmis pour validation.' },
  { type: 'client_response', label: 'Réponses du client', description: 'Quand le client valide ou rejette un contrôle.' },
  { type: 'car', label: 'Actions correctives', description: 'Décisions sur vos actions correctives.' },
  { type: 'mission_closure', label: 'Clôtures de mission', description: 'Quand une mission à laquelle vous participez est clôturée.' },
  { type: 'invitation', label: 'Rappels et invitations', description: 'Relances et invitations liées à vos missions.' },
  { type: 'review_due', label: 'Revues de conformité', description: 'Quand une revue périodique d\'un assujetti que vous supervisez approche ou est en retard.' },
]

export function InAppPreferencesSection({ userId }: Props): JSX.Element | null {
  const { isEnabled, toggle, loading, saving } = useNotificationPreferences(userId)
  if (loading) return null

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="grid grid-cols-[240px_1fr]">
        <div className="bg-page-bg border-r border-gray-200 p-6">
          <h4 className="text-[14px] font-semibold text-gray-900">Notifications dans l&rsquo;application</h4>
          <p className="mt-1 text-[12px] leading-relaxed text-gray-500">
            Choisissez les types de notifications affichés dans la cloche.
          </p>
        </div>
        <div>
          {CONFIGURABLE.map((c) => {
            const on = isEnabled(c.type)
            return (
              <div key={c.type} className="flex items-start justify-between gap-6 px-6 py-4 border-b border-gray-100 last:border-b-0">
                <div className="text-left">
                  <div className="text-[13px] font-semibold text-gray-900">{c.label}</div>
                  <div className="text-[12px] text-gray-500 mt-1 leading-relaxed">{c.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => void toggle(c.type)}
                  disabled={saving}
                  aria-label={`${on ? 'Désactiver' : 'Activer'} : ${c.label}`}
                  aria-pressed={on}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-forest-700' : 'bg-gray-300'} ${saving ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow transition-all ${on ? 'left-[22px]' : 'left-[2px]'}`} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
