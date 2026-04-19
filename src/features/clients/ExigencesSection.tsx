import { useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { useRegulatoryCatalog } from './useRegulatoryCatalog'
import type { ExigenceReglementaire, RegulatoryCatalogItem, RegulatoryJurisdiction } from '../../types/database.types'

interface ExigencesSectionProps {
  exigences: ExigenceReglementaire[]
  disabled: boolean
  onChange: (exigences: ExigenceReglementaire[]) => void
}

const jurisdictionLabels: Record<RegulatoryJurisdiction, string> = {
  'Sénégal': 'Sénégal',
  'UEMOA': 'UEMOA / BCEAO',
  'CEDEAO': 'CEDEAO',
  'CIMA': 'CIMA',
  'International': 'International',
}

const jurisdictionOrder: RegulatoryJurisdiction[] = ['Sénégal', 'UEMOA', 'CIMA', 'CEDEAO', 'International']

const impactVariants: Record<string, 'red' | 'gold' | 'gray'> = {
  fort: 'red',
  moyen: 'gold',
  faible: 'gray',
}

export function ExigencesSection({ exigences, disabled, onChange }: ExigencesSectionProps) {
  const { items: catalog, loading } = useRegulatoryCatalog()
  const [expanded, setExpanded] = useState<string | null>(null)

  const selectedCodes = new Set(exigences.map((e) => e.nom))

  const handleToggle = (item: RegulatoryCatalogItem) => {
    if (selectedCodes.has(item.short_name)) {
      onChange(exigences.filter((e) => e.nom !== item.short_name))
    } else {
      onChange([...exigences, {
        nom: item.short_name,
        type: item.type as ExigenceReglementaire['type'],
        description: item.name,
        impact: item.impact as ExigenceReglementaire['impact'],
      }])
    }
  }

  const grouped = new Map<RegulatoryJurisdiction, RegulatoryCatalogItem[]>()
  for (const jur of jurisdictionOrder) {
    const items = catalog.filter((c) => c.jurisdiction === jur)
    if (items.length > 0) grouped.set(jur, items)
  }

  return (
    <fieldset className="space-y-3">
      <div className="flex items-center justify-between">
        <legend className="text-[13px] font-semibold text-gray-900">Exigences réglementaires</legend>
        <Badge label={`${exigences.length} sélectionnée${exigences.length > 1 ? 's' : ''}`} variant={exigences.length > 0 ? 'forest' : 'gray'} />
      </div>

      {loading ? (
        <p className="text-[13px] text-gray-400">Chargement du catalogue...</p>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([jurisdiction, items]) => (
            <div key={jurisdiction}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-300">
                  {jurisdictionLabels[jurisdiction]}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div className="space-y-1.5">
                {items.map((item) => {
                  const isSelected = selectedCodes.has(item.short_name)
                  const isExpanded = expanded === item.id

                  return (
                    <div key={item.id} className={`rounded-xl border transition-all ${isSelected ? 'border-forest-500 bg-forest-50' : 'border-gray-200'}`}>
                      <label className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggle(item)}
                          disabled={disabled}
                          className="accent-forest-700 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold text-forest-700 font-mono">{item.short_name}</span>
                            <span className={`text-[13px] ${isSelected ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{item.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge label={item.impact} variant={impactVariants[item.impact] ?? 'gray'} />
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setExpanded(isExpanded ? null : item.id) }}
                            className="text-[11px] text-gray-400 hover:text-forest-700"
                          >
                            {isExpanded ? '\u25B2' : '\u25BC'}
                          </button>
                        </div>
                      </label>

                      {isExpanded && (
                        <div className="px-10 pb-3 space-y-2">
                          <p className="text-[12px] text-gray-500 leading-relaxed">{item.description}</p>
                          {item.authority && (
                            <div className="text-[11px] text-gray-400">
                              Autorité : <span className="font-medium text-gray-600">{item.authority}</span>
                            </div>
                          )}
                          {item.penalties && (
                            <div className="text-[11px] text-gray-400">
                              Sanctions : <span className="font-medium text-error">{item.penalties}</span>
                            </div>
                          )}
                          {item.key_obligations.length > 0 && (
                            <div className="mt-1">
                              <div className="text-[11px] font-medium text-gray-500 mb-1">Obligations clés :</div>
                              <ul className="space-y-1">
                                {item.key_obligations.map((ob, i) => (
                                  <li key={i} className="flex items-start gap-2 text-[11px] text-gray-600">
                                    <span className="text-forest-500 mt-0.5">•</span>
                                    <span className="flex-1">{ob.obligation}</span>
                                    <span className="text-gray-300 font-mono flex-shrink-0">{ob.article}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </fieldset>
  )
}
