import { ShieldCheck } from 'lucide-react'

interface MissionConsentOverrideProps {
  /** Consentement IA hérité de la fiche client (null = non renseigné/non consenti). */
  clientConsent: boolean | null
  /** Surcharge mission : null = hériter, true = forcer autoriser, false = forcer refuser. */
  value: boolean | null
  onChange: (value: boolean | null) => void
}

/**
 * Surcharge, au niveau mission, du consentement IA du client (RFC 0012, P2, Décision B).
 * Par défaut la mission hérite de la fiche client ; l'auditeur peut forcer pour ce cas précis.
 */
export function MissionConsentOverride({ clientConsent, value, onChange }: MissionConsentOverrideProps) {
  const selectValue = value === null ? 'inherit' : value ? 'allow' : 'deny'
  const inherited = clientConsent === true ? 'autorisé' : 'non accordé'

  return (
    <div className="mt-4">
      <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-gray-600">
        <ShieldCheck size={13} className="text-forest-700" /> Consentement IA
      </label>
      <select
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value
          onChange(v === 'inherit' ? null : v === 'allow')
        }}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
      >
        <option value="inherit">Hériter du client ({inherited})</option>
        <option value="allow">Autoriser pour cette mission</option>
        <option value="deny">Refuser pour cette mission</option>
      </select>
      <p className="mt-1 text-xs text-gray-500">
        Sans consentement, les contenus de sensibilité élevée sont bloqués ; les moyens sont caviardés.
      </p>
    </div>
  )
}
