/**
 * Hub product definitions — centralized data for the HubPage product grid.
 */

interface ProductStat {
  label: string
  value: string
}

export interface HubProduct {
  name: string
  title: string
  description: string
  color: string
  active: boolean
  badge: string
  stats: ProductStat[]
}

export const HUB_PRODUCTS: HubProduct[] = [
  {
    name: 'Comply',
    title: 'Conformit\u00e9 & Audit SI',
    description: 'Audits multi-r\u00e9f\u00e9rentiels, \u00e9valuations de contr\u00f4les, rapports automatis\u00e9s.',
    color: '#40916C',
    active: true,
    badge: 'Actif',
    // stats live calcul\u00e9es dans HubPage via useComplyHubStats \u2014 laiss\u00e9es vides ici
    stats: [],
  },
  {
    name: 'Risk',
    title: 'Gestion des Risques',
    description: 'Cartographie des risques SI, sc\u00e9narios de menaces, plans de traitement.',
    color: '#DC2626',
    active: false,
    badge: 'Bient\u00f4t',
    stats: [],
  },
  {
    name: 'Policy',
    title: 'Politiques & Gouvernance',
    description: 'R\u00e9daction, validation et diffusion des politiques de s\u00e9curit\u00e9.',
    color: '#7B68EE',
    active: false,
    badge: 'Bient\u00f4t',
    stats: [],
  },
  {
    name: 'Awareness',
    title: 'Sensibilisation',
    description: 'Campagnes de sensibilisation, quiz, suivi de la maturit\u00e9 s\u00e9curit\u00e9.',
    color: '#E67E22',
    active: false,
    badge: '2027',
    stats: [],
  },
  {
    name: 'Data Privacy',
    title: 'Protection des Donn\u00e9es',
    description: 'Registre des traitements, AIPD, conformit\u00e9 RGPD et loi s\u00e9n\u00e9galaise.',
    color: '#3B82F6',
    active: false,
    badge: '2027',
    stats: [],
  },
  {
    name: 'Quality',
    title: 'Qualit\u00e9 & Am\u00e9lioration',
    description: 'Gestion des non-conformit\u00e9s, actions correctives, am\u00e9lioration continue.',
    color: '#0891B2',
    active: false,
    badge: '2027',
    stats: [],
  },
]
