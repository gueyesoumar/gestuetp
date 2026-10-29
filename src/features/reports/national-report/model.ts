// Types et libellés du rapport de supervision nationale (RFC 0024). Les deux RPC
// get_national_regul_summary / get_national_risk_summary renvoient du jsonb typé
// Record<string, unknown> ; on le caste vers ces interfaces (forme construite en 00370).

export interface NationalRegulSummary {
  period: { from: string; to: string }
  perimeter: { assujettis: number; vitales: number }
  conformity: {
    overall: number
    by_sector: { sector: string; value: number; count: number }[]
    by_referential: { referentiel: string; value: number }[]
  }
  findings: {
    by_classification: Record<string, number>
    top_controls: { control_code: string; control_name: string; count: number }[]
  }
  measures: { by_type: Record<string, number>; total: number; closed: number }
  actions: { total: number; closed: number; overdue: number }
  audit_trail: { events: number }
}

export interface NationalRiskSummary {
  period: { from: string; to: string }
  exposure: {
    national_avg: number
    max: number
    by_sector: { sector: string; avg: number; max: number }[]
    zones: { critique: number; surveillance: number; maitrise: number; non_evalue: number }
  }
  top_scenarios: { title: string; org: string; sector: string; dimension: string; exposure: number }[]
  vitales: { total: number; exposed: number; heatmap: { org: string; dimension: string; exposure: number }[] }
  treatment: { active_plans: number; acceptances: number; derogations: number; overdue_reviews: number }
}

export type ReportVariant = 'global' | 'regul' | 'risk'

export interface NationalReportInput {
  regul: NationalRegulSummary
  risk: NationalRiskSummary
  authorityName: string
  periodLabel: string
  generatedAt: string
  variant: ReportVariant
}

const DIM: Record<string, string> = {
  security: 'Sécurité', data_protection: 'Données', resilience: 'Résilience',
  integrity: 'Intégrité', governance: 'Gouvernance', verifiability: 'Vérifiabilité',
  human_factor: 'Facteur humain', third_party: 'Tiers',
}
export const dimLabel = (k: string): string => DIM[k] ?? k

const MEASURE: Record<string, string> = {
  recommandation: 'Rappels', mise_en_demeure: 'Mises en demeure',
  injonction: 'Injonctions', sanction: 'Sanctions',
}
export const measureLabel = (k: string): string => MEASURE[k] ?? k

const CLASSIF: Record<string, string> = {
  major_nc: 'NC majeures', minor_nc: 'NC mineures',
  observation: 'Observations', strength: 'Points forts',
}
export const classifLabel = (k: string): string => CLASSIF[k] ?? k

export const pct = (n: number): string => `${Math.round(n)}%`
