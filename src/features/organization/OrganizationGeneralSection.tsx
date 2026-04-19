import { FormField } from '../../components/ui/FormField'
import { ORG_TYPE_OPTIONS } from '../../lib/constants'

interface OrganizationGeneralSectionProps {
  name: string
  slug: string
  website: string
  types: string[]
  disabled: boolean
  onName: (v: string) => void
  onSlug: (v: string) => void
  onWebsite: (v: string) => void
  onTypeToggle: (type: string) => void
}

export function OrganizationGeneralSection({
  name, slug, website, types, disabled,
  onName, onSlug, onWebsite, onTypeToggle,
}: OrganizationGeneralSectionProps) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-gray-900">Informations g&eacute;n&eacute;rales</legend>

      <FormField id="org-name" label="Nom" value={name} onChange={onName} required disabled={disabled} />
      <FormField id="org-slug" label="Identifiant (slug)" value={slug} onChange={onSlug} required disabled={disabled} />
      <FormField id="org-website" label="Site web" type="url" value={website} onChange={onWebsite} placeholder="https://..." disabled={disabled} />

      <div>
        <span className="block text-sm font-medium text-gray-700">Type d&apos;organisation</span>
        <div className="mt-2 space-y-2">
          {ORG_TYPE_OPTIONS.map((t) => (
            <label key={t.value} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={types.includes(t.value)}
                onChange={() => onTypeToggle(t.value)}
                disabled={disabled}
                className="rounded border-gray-300"
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>
    </fieldset>
  )
}
