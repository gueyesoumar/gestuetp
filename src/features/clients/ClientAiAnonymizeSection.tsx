import { VenetianMask } from 'lucide-react'

interface ClientAiAnonymizeSectionProps {
  aiAnonymize: boolean
  anonymizeAt: string | null
  disabled: boolean
  onChange: (value: boolean) => void
}

/**
 * Anonymisation réversible du client (RFC 0012, P4). Quand elle est activée, les données
 * sensibles de ce client (noms, e-mails, IBAN, téléphones, identifiants) sont remplacées
 * par des pseudonymes cohérents avant tout envoi au modèle, puis restaurées dans la réponse
 * affichée. La table de correspondance reste côté serveur (jamais transmise au modèle).
 */
export function ClientAiAnonymizeSection({ aiAnonymize, anonymizeAt, disabled, onChange }: ClientAiAnonymizeSectionProps) {
  const dateLabel = anonymizeAt
    ? new Date(anonymizeAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <VenetianMask size={18} className="mt-0.5 shrink-0 text-forest-700" />
          <div>
            <p className="text-sm font-medium text-gray-900">Anonymiser avant envoi à l&rsquo;IA</p>
            <p className="mt-1 text-[13px] text-gray-600">
              {aiAnonymize
                ? 'Activée : les données sensibles sont remplacées par des pseudonymes cohérents avant l’analyse, puis restaurées dans les résultats. Le modèle ne voit jamais les vraies valeurs.'
                : 'Désactivée : comportement standard (contenus faibles autorisés, moyens caviardés, élevés bloqués sans accord).'}
            </p>
            {aiAnonymize && dateLabel && (
              <p className="mt-1 text-xs text-gray-400">Activée le {dateLabel}.</p>
            )}
          </div>
        </div>

        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={aiAnonymize}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          <div className="h-6 w-11 rounded-full bg-gray-300 transition-colors peer-checked:bg-forest-700 peer-focus:ring-2 peer-focus:ring-forest-100 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
        </label>
      </div>

      <p className="text-xs text-gray-500">
        Réversible : les vraies valeurs réapparaissent dans les résultats. Peut être surchargé
        au cas par cas lors de la création d&rsquo;une mission.
      </p>
    </div>
  )
}
