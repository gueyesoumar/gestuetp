import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export interface ScenarioTemplate {
  id: string
  title: string
  sectors: string[]
  dimension: string | null
  suggested_likelihood: number
  suggested_impact: number
  vulnerability: string | null
}

interface Props {
  onPick: (t: ScenarioTemplate) => void
  /** Secteur de l'assujetti sélectionné : filtre les modèles (vide = universel, toujours affiché). */
  sector?: string | null
}

/** Sélecteur « Partir d'un modèle » : modèles applicables (plateforme + régulateur), filtrés par secteur. */
export function TemplatePicker({ onPick, sector }: Props): JSX.Element | null {
  const [templates, setTemplates] = useState<ScenarioTemplate[]>([])
  const [value, setValue] = useState('')

  useEffect(() => {
    const ac = new AbortController()
    void (async () => {
      const { data, error } = await supabase.rpc('get_scenario_templates').abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (error) { console.error('[get_scenario_templates]', error.message); return }
      setTemplates((data ?? []) as unknown as ScenarioTemplate[])
    })()
    return () => ac.abort()
  }, [])

  // Un changement de secteur peut masquer le modèle choisi : on réinitialise la sélection.
  useEffect(() => { setValue('') }, [sector])

  // Secteur connu -> modèles du secteur + universels (sectors vide) ; sinon tout.
  const visible = templates.filter((t) => t.sectors.length === 0 || !sector || t.sectors.includes(sector))

  if (visible.length === 0) return null

  return (
    <div className="rounded-lg border border-forest-100 bg-forest-50/50 p-3">
      <label className="flex items-center gap-1.5 text-[12px] font-semibold text-forest-800 mb-1">
        <Sparkles size={14} /> Partir d&rsquo;un modèle <span className="font-normal text-forest-700/70">(optionnel)</span>
      </label>
      <select
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          const t = visible.find((x) => x.id === e.target.value)
          if (t) onPick(t)
        }}
        className="w-full px-3 py-2 text-sm border border-forest-200 rounded-lg bg-white focus:border-forest-700"
      >
        <option value="">Choisir un modèle adapté à votre secteur...</option>
        {visible.map((t) => (
          <option key={t.id} value={t.id}>{t.title}{t.sectors.length > 0 ? ` (${t.sectors.join(', ')})` : ''}</option>
        ))}
      </select>
    </div>
  )
}
