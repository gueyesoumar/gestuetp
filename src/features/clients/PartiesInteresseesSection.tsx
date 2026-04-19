import { Badge } from '../../components/ui/Badge'
import { PARTIE_INTERESSEE_TYPE_OPTIONS } from '../../lib/constants'
import type { PartieInteressee } from '../../types/database.types'

interface PartiesInteresseesSectionProps {
  parties: PartieInteressee[]
  disabled: boolean
  onChange: (parties: PartieInteressee[]) => void
}

export function PartiesInteresseesSection({ parties, disabled, onChange }: PartiesInteresseesSectionProps) {
  const handleAdd = () => {
    onChange([...parties, { nom: '', type: 'externe', attentes: '' }])
  }

  const handleRemove = (index: number) => {
    onChange(parties.filter((_, i) => i !== index))
  }

  const handleUpdate = (index: number, field: keyof PartieInteressee, value: string) => {
    const updated = parties.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    )
    onChange(updated)
  }

  return (
    <fieldset className="space-y-3">
      <div className="flex items-center justify-between">
        <legend className="text-sm font-semibold text-gray-900">Parties int&eacute;ress&eacute;es</legend>
        <Badge label={`${parties.length}`} variant="gray" />
      </div>

      {parties.map((partie, idx) => (
        <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Partie #{idx + 1}</span>
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              disabled={disabled}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Supprimer
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={partie.nom}
              onChange={(e) => handleUpdate(idx, 'nom', e.target.value)}
              placeholder="Nom (ex : CNIL, Clients)"
              disabled={disabled}
              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
            />
            <select
              value={partie.type}
              onChange={(e) => handleUpdate(idx, 'type', e.target.value)}
              disabled={disabled}
              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
            >
              {PARTIE_INTERESSEE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={partie.attentes}
            onChange={(e) => handleUpdate(idx, 'attentes', e.target.value)}
            placeholder="Attentes en matière de sécurité"
            disabled={disabled}
            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled}
        className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-forest-300 hover:text-forest-700 w-full"
      >
        + Ajouter une partie int&eacute;ress&eacute;e
      </button>
    </fieldset>
  )
}
