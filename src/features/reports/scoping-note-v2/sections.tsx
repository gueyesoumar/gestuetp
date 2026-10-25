import { SCOPING_SECTION_CATALOG } from './catalog'
import type { ScopingSectionProps } from './model'
import { PreambuleSection, ObjectifsSection, PerimetreSection, MethodologieSection, RisquesSection } from './sections-a'
import { EquipeSection, PlanningSection, LivrablesSection, HypothesesSection, SignaturesSection } from './sections-b'

// Registre des sections de la note de cadrage, derive du catalogue (source unique
// d'ordre + libelles, partagee avec l'editeur de templates). RFC 0021 E2.1.

export interface ScopingContentSection {
  key: string
  title: string
  Component: (props: ScopingSectionProps) => JSX.Element
}

const COMPONENTS: Record<string, (props: ScopingSectionProps) => JSX.Element> = {
  preambule: PreambuleSection,
  objectifs: ObjectifsSection,
  perimetre: PerimetreSection,
  methodologie: MethodologieSection,
  risques: RisquesSection,
  equipe: EquipeSection,
  planning: PlanningSection,
  livrables: LivrablesSection,
  hypotheses: HypothesesSection,
  signatures: SignaturesSection,
}

export const SCOPING_CONTENT_SECTIONS: ScopingContentSection[] = SCOPING_SECTION_CATALOG
  .map((c) => ({ key: c.key, title: c.title, Component: COMPONENTS[c.key] }))
  .filter((c): c is ScopingContentSection => Boolean(c.Component))
