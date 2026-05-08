import { useFeatureCatalog, type FeatureCatalogItem } from './useFeatureCatalog'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'

interface PlanFeaturesPickerProps {
  selected: Set<string>
  onChange: (next: Set<string>) => void
  disabled?: boolean
}

export function PlanFeaturesPicker({ selected, onChange, disabled }: PlanFeaturesPickerProps): JSX.Element {
  const { groups, loading } = useFeatureCatalog()

  if (loading) return <div className="py-8 flex justify-center"><LoadingSpinner /></div>
  if (groups.length === 0) {
    return <p className="px-6 py-8 text-[12px] text-gray-400 italic text-center">Aucune fonctionnalité enregistrée.</p>
  }

  const toggle = (flagId: string): void => {
    if (disabled) return
    const next = new Set(selected)
    if (next.has(flagId)) next.delete(flagId)
    else next.add(flagId)
    onChange(next)
  }

  const toggleAllInGroup = (groupItems: FeatureCatalogItem[], on: boolean): void => {
    if (disabled) return
    const next = new Set(selected)
    for (const i of groupItems) {
      if (on) next.add(i.id)
      else next.delete(i.id)
    }
    onChange(next)
  }

  return (
    <div>
      {groups.map((group) => {
        const allOn = group.items.every((i) => selected.has(i.id))
        return (
          <div key={group.category} className="border-b border-gray-100 last:border-b-0">
            <div className="bg-gray-50 px-5 py-2 flex items-center justify-between">
              <span className="text-[10.5px] uppercase tracking-wider font-bold text-gray-600">{group.label}</span>
              <button
                type="button"
                onClick={() => toggleAllInGroup(group.items, !allOn)}
                disabled={disabled}
                className="text-[10.5px] font-semibold text-forest-700 hover:text-forest-900 disabled:opacity-50"
              >
                {allOn ? 'Tout décocher' : 'Tout cocher'}
              </button>
            </div>
            {group.items.map((item) => (
              <FeatureRow
                key={item.id}
                item={item}
                checked={selected.has(item.id)}
                onChange={() => toggle(item.id)}
                disabled={disabled}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function FeatureRow({ item, checked, onChange, disabled }: { item: FeatureCatalogItem; checked: boolean; onChange: () => void; disabled?: boolean }): JSX.Element {
  return (
    <label className={`flex items-start gap-3 px-5 py-2.5 border-b border-gray-50 hover:bg-gray-50/50 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 accent-forest-700 w-4 h-4"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-semibold text-gray-900">{item.name}</span>
          <MaturityBadge maturity={item.maturity} />
          {!item.is_globally_enabled && (
            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide bg-red-50 text-red-600" title="Kill switch global activé">
              Off global
            </span>
          )}
        </div>
        {item.description && <p className="text-[11px] text-gray-500 mt-0.5">{item.description}</p>}
        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{item.slug}</p>
      </div>
    </label>
  )
}

function MaturityBadge({ maturity }: { maturity: 'stable' | 'beta' | 'new' }): JSX.Element | null {
  if (maturity === 'stable') return null
  if (maturity === 'beta') {
    return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide bg-gold-100 text-gold-700">Beta</span>
  }
  return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">Nouveau</span>
}
