import { VenetianMask } from 'lucide-react'

interface MissionAnonymizeOverrideProps {
  /** Anonymisation héritée de la fiche client (null = non renseignée/désactivée). */
  clientAnonymize: boolean | null
  /** Surcharge mission : null = hériter, true = forcer activer, false = forcer désactiver. */
  value: boolean | null
  onChange: (value: boolean | null) => void
}

/**
 * Surcharge, au niveau mission, de l'anonymisation réversible IA du client (RFC 0012, P4).
 * Par défaut la mission hérite de la fiche client ; l'auditeur peut forcer pour ce cas précis.
 */
export function MissionAnonymizeOverride({ clientAnonymize, value, onChange }: MissionAnonymizeOverrideProps) {
  const selectValue = value === null ? 'inherit' : value ? 'allow' : 'deny'
  const inherited = clientAnonymize === true ? 'activée' : 'désactivée'

  return (
    <div className="mt-4">
      <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-gray-600">
        <VenetianMask size={13} className="text-forest-700" /> Anonymisation IA
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
        <option value="allow">Activer pour cette mission</option>
        <option value="deny">Désactiver pour cette mission</option>
      </select>
      <p className="mt-1 text-xs text-gray-500">
        Si activée, les données sensibles sont pseudonymisées avant l&rsquo;IA puis restaurées dans les résultats.
      </p>
    </div>
  )
}
