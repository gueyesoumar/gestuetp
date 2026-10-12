import type { ConnectorProvider } from '../../types/database.types'

export interface ConnectorField { key: string; label: string; type?: 'text' | 'password' }

export interface ConnectorDescriptor {
  provider: ConnectorProvider
  label: string
  /** Edge function qui gère connect/collect pour ce connecteur. */
  edge: string
  fields: ConnectorField[]
  hint: string
}

/** Connecteurs exposés dans l'UI (RFC 0014). Ajouter un connecteur = une entrée ici. */
export const CONNECTORS: ConnectorDescriptor[] = [
  {
    provider: 'tenable',
    label: 'Tenable',
    edge: 'connector-tenable',
    fields: [{ key: 'accessKey', label: 'Access key' }, { key: 'secretKey', label: 'Secret key', type: 'password' }],
    hint: "Clés d'API en lecture seule, générées dans Tenable > Settings > My Account > API Keys.",
  },
  {
    provider: 'github',
    label: 'GitHub',
    edge: 'connector-github',
    fields: [{ key: 'org', label: 'Organisation' }, { key: 'token', label: 'Token fine-grained', type: 'password' }],
    hint: "Token fine-grained en lecture (Organization permissions), dans GitHub > Settings > Developer settings.",
  },
]
