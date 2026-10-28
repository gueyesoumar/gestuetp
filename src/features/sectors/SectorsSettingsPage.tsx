import { useState } from 'react'
import { Boxes, Plus } from 'lucide-react'
import { useOrgSectors } from './useOrgSectors'
import { SectorRow } from './SectorRow'
import { useCabinetPermissions } from '../../hooks/useCabinetPermissions'
import { useToast } from '../../hooks/useToast'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'

export function SectorsSettingsPage(): JSX.Element {
  const s = useOrgSectors()
  const { canManageSectors } = useCabinetPermissions()
  const toast = useToast()
  const [label, setLabel] = useState('')
  const ro = !canManageSectors

  if (s.loading) return <LoadingSpinner />
  if (s.error) return <ErrorAlert message={s.error} />

  const add = async (): Promise<void> => {
    const ok = await s.create(label)
    if (ok) { setLabel(''); toast.success('Secteur ajouté') } else toast.error('Ajout impossible')
  }
  const rename = async (id: string, l: string): Promise<void> => {
    const ok = await s.rename(id, l)
    if (ok) toast.success('Secteur renommé'); else toast.error('Renommage impossible')
  }
  const toggle = async (id: string, active: boolean): Promise<void> => {
    const ok = await s.setActive(id, active)
    if (!ok) toast.error('Modification impossible')
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Boxes size={20} className="text-[#E07A5F]" /> Secteurs
        </h1>
        <p className="mt-1 text-[13px] text-gray-500">
          La taxonomie proposée sur vos entités, modèles de risque et affectations. Les secteurs hérités (plateforme, régulateur) sont en lecture seule.
        </p>
      </div>

      {ro && (
        <p className="text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Lecture seule : la permission « Gérer les secteurs » est requise pour modifier cette liste.
        </p>
      )}

      {!ro && (
        <div className="flex items-center gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void add() }}
            placeholder="Nouveau secteur"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700"
          />
          <button
            type="button"
            onClick={() => void add()}
            disabled={!label.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50"
          >
            <Plus size={16} /> Ajouter
          </button>
        </div>
      )}

      <section>
        <h2 className="text-[13px] font-semibold text-gray-700 mb-2">Mes secteurs</h2>
        <div className="rounded-lg border border-gray-200 bg-white">
          {s.own.length === 0 ? (
            <p className="px-3 py-4 text-[13px] text-gray-400">Aucun secteur propre. Les secteurs hérités ci-dessous restent disponibles.</p>
          ) : (
            s.own.map((r) => (
              <SectorRow key={r.id} row={r} ro={ro} onRename={(id, l) => void rename(id, l)} onToggle={(id, a) => void toggle(id, a)} />
            ))
          )}
        </div>
      </section>

      {s.inherited.length > 0 && (
        <section>
          <h2 className="text-[13px] font-semibold text-gray-700 mb-2">
            Secteurs hérités <span className="font-normal text-gray-400">(plateforme et régulateur, lecture seule)</span>
          </h2>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 flex flex-wrap gap-1.5">
            {s.inherited.map((r) => (
              <span
                key={r.id}
                className={`text-[12px] px-2 py-0.5 rounded-full border ${r.is_active ? 'border-gray-200 text-gray-600 bg-white' : 'border-gray-200 text-gray-400 bg-gray-100'}`}
              >
                {r.label}{!r.is_active && ' (archivé)'}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default SectorsSettingsPage
