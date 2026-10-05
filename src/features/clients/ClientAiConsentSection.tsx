import { ShieldCheck } from 'lucide-react'

interface ClientAiConsentSectionProps {
  aiConsent: boolean
  consentAt: string | null
  disabled: boolean
  onChange: (value: boolean) => void
}

/**
 * Consentement IA du client (RFC 0012, P2). Quand il est accordé, les documents et
 * données de ce client peuvent être transmis au modèle externe pour les contenus de
 * sensibilité « élevée ». Sans consentement, ces contenus sont bloqués (posture sûre).
 */
export function ClientAiConsentSection({ aiConsent, consentAt, disabled, onChange }: ClientAiConsentSectionProps) {
  const dateLabel = consentAt
    ? new Date(consentAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-forest-700" />
          <div>
            <p className="text-sm font-medium text-gray-900">Consentement à l&rsquo;analyse IA</p>
            <p className="mt-1 text-[13px] text-gray-600">
              {aiConsent
                ? 'Accordé : les données de ce client peuvent être transmises au modèle, y compris les contenus de sensibilité élevée.'
                : 'Non accordé : les contenus de sensibilité élevée de ce client sont bloqués avant tout envoi au modèle. Les contenus moyens sont caviardés, les faibles autorisés.'}
            </p>
            {aiConsent && dateLabel && (
              <p className="mt-1 text-xs text-gray-400">Accordé le {dateLabel}.</p>
            )}
          </div>
        </div>

        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={aiConsent}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          <div className="h-6 w-11 rounded-full bg-gray-300 transition-colors peer-checked:bg-forest-700 peer-focus:ring-2 peer-focus:ring-forest-100 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
        </label>
      </div>

      <p className="text-xs text-gray-500">
        Base légale du traitement IA pour ce client. Révocable à tout moment. Peut être surchargé
        au cas par cas lors de la création d&rsquo;une mission.
      </p>
    </div>
  )
}
