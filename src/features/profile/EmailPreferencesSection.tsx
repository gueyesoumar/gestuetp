import { useEmailPreferences } from './useEmailPreferences'
import { useToast } from '../../hooks/useToast'

interface Props {
  userId: string
}

export function EmailPreferencesSection({ userId }: Props) {
  const { preferences, loading, saving, update } = useEmailPreferences(userId)
  const toast = useToast()

  if (loading || !preferences) return null

  const handleToggle = async (key: 'reminders_enabled' | 'digest_enabled', next: boolean) => {
    const ok = await update({ [key]: next })
    if (ok) {
      toast.success('Préférences mises à jour')
    } else {
      toast.error('Mise à jour impossible')
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="grid grid-cols-[240px_1fr]">
        <div className="bg-page-bg border-r border-gray-200 p-6">
          <h4 className="text-[14px] font-semibold text-gray-900">Pr&eacute;f&eacute;rences email</h4>
          <p className="mt-1 text-[12px] leading-relaxed text-gray-500">
            Choisissez les emails automatiques que vous souhaitez recevoir.
          </p>
        </div>
        <div>
          <PrefRow
            label="Relances de demandes de preuves"
            description="Vous notifie à J+3, J+7 et J+14 quand un document que vous avez demandé n'est pas encore déposé."
            enabled={preferences.reminders_enabled}
            disabled={saving}
            onToggle={(v) => void handleToggle('reminders_enabled', v)}
          />
          <PrefRow
            label="Résumé hebdomadaire"
            description="Tous les lundis à 7 h, un récapitulatif des tâches à mener et des échéances de la semaine."
            enabled={preferences.digest_enabled}
            disabled={saving}
            onToggle={(v) => void handleToggle('digest_enabled', v)}
            comingSoon
          />
          <PrefRow
            label="Notifications opérationnelles essentielles"
            description="Création de compte, réinitialisation de mot de passe, validations de revue. Ces emails ne peuvent pas être désactivés."
            enabled
            disabled
            onToggle={() => undefined}
          />
        </div>
      </div>
    </div>
  )
}

function PrefRow({
  label,
  description,
  enabled,
  disabled,
  onToggle,
  comingSoon,
}: {
  label: string
  description: string
  enabled: boolean
  disabled: boolean
  onToggle: (v: boolean) => void
  comingSoon?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-6 px-6 py-4 border-b border-gray-100 last:border-b-0">
      <div className="text-left">
        <div className="text-[13px] font-semibold text-gray-900 flex items-center gap-2">
          {label}
          {comingSoon && (
            <span className="text-[9px] uppercase tracking-wider font-bold text-gold-600 bg-gold-50 px-1.5 py-0.5 rounded-full">
              Bient&ocirc;t
            </span>
          )}
        </div>
        <div className="text-[12px] text-gray-500 mt-1 leading-relaxed">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        disabled={disabled || comingSoon}
        aria-label={`${enabled ? 'Désactiver' : 'Activer'} : ${label}`}
        aria-pressed={enabled}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
          enabled ? 'bg-forest-700' : 'bg-gray-300'
        } ${disabled || comingSoon ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow transition-all ${
            enabled ? 'left-[22px]' : 'left-[2px]'
          }`}
        />
      </button>
    </div>
  )
}
