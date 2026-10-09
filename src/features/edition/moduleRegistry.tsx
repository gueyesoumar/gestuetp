import type { ReactNode } from 'react'
import { ShieldCheck, Building2, RefreshCw, ListChecks, ClipboardCheck, AlertTriangle, Siren, Users, BookMarked } from 'lucide-react'
import type { Capability } from '../../types/database.types'
import type { ProductVocab } from '../../lib/product'

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
  /** Force une correspondance exacte pour l'état actif (index d'un workspace). */
  end?: boolean
}

/** Contexte de résolution d'un module : capacités + vocabulaire + permissions. */
export interface ModuleCtx {
  has: (cap: Capability) => boolean
  vocab: ProductVocab
  canViewSupervision: boolean
  isGroup: boolean
}

/**
 * Module de l'application, monté selon les CAPACITÉS (jamais une chaîne d'édition).
 * Registre qui remplace le binaire `isRegul` (RFC 0013, chantier C1).
 * C1.1 : navigation seulement. Les routes + dashboard d'accueil viendront en C1.2.
 */
export interface AppModule {
  key: string
  /** Activation basée UNIQUEMENT sur les capacités → utilisable par la nav ET le routing. */
  enabled: (has: (cap: Capability) => boolean) => boolean
  /** Nom du produit « édition » correspondant dans le catalogue du Hub (tuile primaire). */
  product?: string
  /** Clé du preset de vocabulaire de ce monde (RFC 0013 C2), repli « comply ». */
  vocabPreset?: string
  /** Items de nav principaux apportés par ce module. */
  nav?: (ctx: ModuleCtx) => NavItem[]
  /** Items de nav du bloc « Groupe ». */
  group?: (ctx: ModuleCtx) => NavItem[]
}

const sz = { size: 20, strokeWidth: 1.5 } as const

export const APP_MODULES: AppModule[] = [
  {
    // Monde « superviseur d'autrui » (Regul, et tout org avec la capacité supervision).
    key: 'supervision-core',
    enabled: (has) => has('supervision'),
    product: 'Regul',
    vocabPreset: 'regul',
    nav: (c) => {
      const items: NavItem[] = [
        { to: '/assujettis', label: c.vocab.entitiesTitle, icon: <Building2 {...sz} /> },
        { to: '/controles', label: c.vocab.missionTerm, icon: <ClipboardCheck {...sz} /> },
      ]
      if (c.has('measures')) items.push({ to: '/constats', label: 'Constats & mesures', icon: <AlertTriangle {...sz} /> })
      if (c.has('incidents')) items.push({ to: '/incidents', label: 'Incidents', icon: <Siren {...sz} /> })
      items.push({ to: '/referentiels', label: 'Référentiels', icon: <BookMarked {...sz} /> })
      return items
    },
  },
  {
    // Monde « cabinet / audit » — audite des clients externes (a un portail tiers).
    key: 'audit-core',
    enabled: (has) => !has('supervision') && has('client_portal'),
    product: 'Comply',
    vocabPreset: 'comply',
    nav: (c) => {
      const items: NavItem[] = []
      if (c.canViewSupervision) items.push({ to: '/supervision', label: 'Supervision', icon: <ShieldCheck {...sz} /> })
      items.push({ to: '/clients', label: 'Clients', icon: <Users {...sz} /> })
      items.push({ to: '/referentiels', label: 'Référentiels', icon: <BookMarked {...sz} /> })
      items.push({ to: '/missions', label: c.vocab.missionTerm, icon: <ClipboardCheck {...sz} /> })
      return items
    },
    group: (c) => c.isGroup ? GROUP_NAV : [],
  },
  {
    // Monde « entreprise » — gère sa PROPRE conformité : pas de supervision tierce,
    // PAS de portail client (c'est ce qui le distingue du cabinet, RFC 0013 §11).
    key: 'enterprise-core',
    enabled: (has) => !has('supervision') && !has('client_portal'),
    product: 'Comply',           // sous marque Comply (décision §9.a)
    vocabPreset: 'entreprise',
    nav: (c) => [
      { to: '/referentiels', label: 'Référentiels', icon: <BookMarked {...sz} /> },
      { to: '/missions', label: c.vocab.missionTerm, icon: <ClipboardCheck {...sz} /> }, // « Campagnes »
    ],
    group: (c) => c.isGroup ? GROUP_NAV : [],
  },
]

const GROUP_NAV: NavItem[] = [
  { to: '/filiales', label: 'Filiales', icon: <Building2 {...sz} /> },
  { to: '/revues', label: 'Revues continues', icon: <RefreshCw {...sz} /> },
  { to: '/plans-transverses', label: "Plans d'action", icon: <ListChecks {...sz} /> },
]
