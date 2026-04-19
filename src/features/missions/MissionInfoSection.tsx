import { FormField } from '../../components/ui/FormField'
import type { CabinetClient, Framework } from '../../types/database.types'

interface MissionInfoSectionProps {
  name: string
  description: string
  clientId: string
  frameworkId: string
  startDate: string
  endDate: string
  clients: CabinetClient[]
  frameworks: Framework[]
  disabled: boolean
  onName: (v: string) => void
  onDescription: (v: string) => void
  onClientId: (v: string) => void
  onFrameworkId: (v: string) => void
  onStartDate: (v: string) => void
  onEndDate: (v: string) => void
}

export function MissionInfoSection({
  name, description, clientId, frameworkId, startDate, endDate,
  clients, frameworks, disabled,
  onName, onDescription, onClientId, onFrameworkId, onStartDate, onEndDate,
}: MissionInfoSectionProps) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-gray-900">Informations de la mission</legend>

      <FormField id="mission-name" label="Nom de la mission" value={name} onChange={onName} required disabled={disabled} />
      <FormField id="mission-desc" label="Description" value={description} onChange={onDescription} multiline disabled={disabled} />

      <div>
        <label htmlFor="mission-client" className="block text-sm font-medium text-gray-700">Client</label>
        <select
          id="mission-client"
          required
          value={clientId}
          onChange={(e) => onClientId(e.target.value)}
          disabled={disabled}
          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
        >
          <option value="">S&eacute;lectionner un client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.client_name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="mission-framework" className="block text-sm font-medium text-gray-700">R&eacute;f&eacute;rentiel</label>
        <select
          id="mission-framework"
          required
          value={frameworkId}
          onChange={(e) => onFrameworkId(e.target.value)}
          disabled={disabled}
          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
        >
          <option value="">S&eacute;lectionner un r&eacute;f&eacute;rentiel</option>
          {frameworks.map((f) => (
            <option key={f.id} value={f.id}>{f.name} {f.version ? `v${f.version}` : ''}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField id="mission-start" label="Date de d&eacute;but" type="date" value={startDate} onChange={onStartDate} required disabled={disabled} />
        <FormField id="mission-end" label="Date de fin" type="date" value={endDate} onChange={onEndDate} required disabled={disabled} />
      </div>
    </fieldset>
  )
}
