import { useMemo, useState } from 'react'
import { LibraryBig, Plus, Pencil, Trash2 } from 'lucide-react'
import { useScenarioTemplates, type ScenarioTemplateRow } from './useScenarioTemplates'
import { TemplateFormModal } from './TemplateFormModal'
import { ExpoBadge, DimChip } from './riskLabels'
import { riskExposure } from '../../lib/constants'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { EmptyState } from '../../components/ui/EmptyState'

const ALL = 'Tous secteurs'

/** Régulateur : édition du catalogue de modèles de scénarios par secteur. */
export function ScenarioTemplatesPage(): JSX.Element {
  const { templates, loading, error, save, remove, loadNodes } = useScenarioTemplates()
  const [edit, setEdit] = useState<ScenarioTemplateRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [sector, setSector] = useState('')

  const sectors = useMemo(() => [...new Set(templates.flatMap((t) => t.sectors))].sort(), [templates])
  const filtered = useMemo(() => sector
    ? templates.filter((t) => sector === ALL ? t.sectors.length === 0 : t.sectors.includes(sector))
    : templates, [templates, sector])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><LibraryBig size={20} className="text-[#E07A5F]" /> Modèles de scénarios</h1>
          <p className="mt-1 text-[13px] text-gray-500">Vos modèles par secteur, proposés à vos assujettis à la création d&rsquo;un risque. Le catalogue plateforme reste disponible en plus des vôtres.</p>
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900"><Plus size={16} /> Nouveau modèle</button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select value={sector} onChange={(e) => setSector(e.target.value)} className="px-2 py-2 text-[12px] border border-gray-300 rounded-lg">
          <option value="">Tous les modèles</option>
          <option value={ALL}>Tous secteurs (transverses)</option>
          {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-[12px] text-gray-400">{filtered.length} modèle{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {templates.length === 0 ? (
        <EmptyState title="Aucun modèle propre" description="Créez vos modèles par secteur, ou laissez vos assujettis utiliser le catalogue plateforme." action={<button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900"><Plus size={15} /> Nouveau modèle</button>} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Modèle</th>
                <th className="text-left px-4 py-3 font-semibold">Secteurs</th>
                <th className="text-left px-4 py-3 font-semibold">Dimension</th>
                <th className="text-left px-4 py-3 font-semibold">Exposition suggérée</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.title}</td>
                  <td className="px-4 py-3 text-gray-500">{t.sectors.length > 0 ? t.sectors.join(', ') : 'Tous secteurs'}</td>
                  <td className="px-4 py-3"><DimChip d={t.dimension} /></td>
                  <td className="px-4 py-3"><ExpoBadge value={riskExposure(t.suggested_likelihood, t.suggested_impact)} /></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEdit(t)} className="text-gray-400 hover:text-forest-700" title="Modifier"><Pencil size={15} /></button>
                    <button onClick={() => { if (window.confirm('Supprimer ce modèle ?')) void remove(t.id) }} className="ml-3 text-gray-400 hover:text-red-600" title="Supprimer"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || edit) && (
        <TemplateFormModal template={edit} loadNodes={loadNodes} onSave={save} onClose={() => { setCreating(false); setEdit(null) }} />
      )}
    </div>
  )
}
