/**
 * Types partagés des produits du Hub (RFC 0006 — couche ① catalogue).
 *
 * Les DONNÉES vivent désormais dans la table `products` (migration 00198) et sont
 * lues via useHubProducts() (src/features/hub/useHubProducts.ts). Ce fichier ne
 * conserve que les types consommés par les composants de l'orbite.
 */

export interface ProductStat {
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
