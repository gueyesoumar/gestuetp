// Dimensions du Trust Score affichees dans le cadran segmente du Hub.
// v1 : seule la conformite (Comply) est active ; les autres dimensions arrivent
// avec les modules Risk / Awareness / incidents (degradation gracieuse -> n/c).

export interface ScoreDimension {
  label: string
  module: string
  configured: boolean
}

export const SCORE_DIMENSIONS: readonly ScoreDimension[] = [
  { label: 'Conformité', module: 'Comply', configured: true },
  { label: 'Exposition risque', module: 'Risk', configured: false },
  { label: 'Maturité humaine', module: 'Awareness', configured: false },
  { label: 'Incidents', module: 'Regul', configured: false },
]
