import type { ScenarioRow } from './useRiskRegister'

export interface CompletenessItem {
  label: string
  done: boolean
}

export interface Completeness {
  items: CompletenessItem[]
  filled: number
  total: number
  pct: number
}

/**
 * Complétude ISO 27005 d'un scénario (RFC 0017 Lot B) : proportion des artefacts
 * clés renseignés, dérivée des CHAMPS DE LA LIGNE uniquement (aucune requête
 * supplémentaire). Nourrit la jauge de la bande de synthèse et la création.
 */
export function scenarioCompleteness(s: Pick<ScenarioRow,
  'threat_ref' | 'feared_event_ref' | 'asset_name' | 'vulnerability'
  | 'inherent_likelihood' | 'inherent_impact' | 'treatment' | 'next_review_at'>): Completeness {
  const items: CompletenessItem[] = [
    { label: 'Menace et événement redouté identifiés', done: !!s.threat_ref && !!s.feared_event_ref },
    { label: 'Actif ou vulnérabilité précisé', done: !!s.asset_name || !!s.vulnerability },
    { label: 'Cotation renseignée', done: s.inherent_likelihood > 0 && s.inherent_impact > 0 },
    { label: 'Traitement décidé', done: s.treatment !== 'untreated' },
    { label: 'Revue planifiée', done: !!s.next_review_at },
  ]
  const filled = items.filter((i) => i.done).length
  return { items, filled, total: items.length, pct: Math.round((filled / items.length) * 100) }
}
