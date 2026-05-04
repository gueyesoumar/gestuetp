import { supabase } from '../../lib/supabase'
import type { MissionDetail, MissionMemberRow } from '../missions/useMissionDetail'
import type { DomainWithControls } from '../frameworks/useFrameworkDetail'
import type { CabinetClient } from '../../types/database.types'
import type { AssessmentWithControl, AuditReportData, ClientContact, EvidenceDoc } from './generateAuditReportPDF'

/**
 * Charge en une fois toutes les données nécessaires au rapport d'audit PDF.
 * Appelé à la demande (au clic du bouton "Rapport PDF") plutôt que de
 * surcharger le chargement initial de la page Clôture.
 */
export async function loadAuditReportData(mission: MissionDetail): Promise<AuditReportData> {
  // 1. Membres de la mission (avec user)
  const { data: membersRaw } = await supabase
    .from('mission_members')
    .select('id, mission_id, user_id, role, user:users(id, first_name, last_name, email, job_title)')
    .eq('mission_id', mission.id)

  const members = (membersRaw ?? []) as unknown as MissionMemberRow[]

  // 2. Domaines + contrôles du framework (avec description)
  const { data: domainRows } = await supabase
    .from('domains')
    .select('id, code, name, description, sort_order, controls(id, code, name, description, sort_order, domain_id)')
    .eq('framework_id', mission.framework_id)
    .order('sort_order')

  const domains: DomainWithControls[] = ((domainRows ?? []) as unknown as Array<{
    id: string; code: string; name: string; description: string | null; sort_order: number;
    controls: Array<{ id: string; code: string; name: string; description: string | null; sort_order: number; domain_id: string }>
  }>).map((d) => ({
    ...d,
    controls: [...(d.controls ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  }))

  // 3. Assessments avec contrôle joint (incl. description)
  const { data: assessRaw } = await supabase
    .from('control_assessments')
    .select('*, control:controls(id, code, name, description, domain_id)')
    .eq('mission_id', mission.id)

  const assessments = (assessRaw ?? []) as unknown as AssessmentWithControl[]

  // 3b. Synthese des findings (assessment_findings) vers les champs legacy
  // pour compatibilite avec auditReportNarratives + generateAuditReportPDF.
  const assessmentIds = assessments.map((a) => a.id)
  if (assessmentIds.length > 0) {
    const { data: findingsRaw } = await supabase
      .from('assessment_findings')
      .select('assessment_id, classification, description, risk, recommendation, ord')
      .in('assessment_id', assessmentIds)
      .order('ord', { ascending: true })

    type FindingRow = { assessment_id: string; classification: string; description: string; risk: string | null; recommendation: string | null }
    const byAssessment = new Map<string, FindingRow[]>()
    for (const f of (findingsRaw ?? []) as FindingRow[]) {
      const list = byAssessment.get(f.assessment_id) ?? []
      list.push(f)
      byAssessment.set(f.assessment_id, list)
    }

    const SEVERITY: Record<string, number> = { major_nc: 4, minor_nc: 3, observation: 2, strength: 1 }
    for (const a of assessments) {
      const fs = byAssessment.get(a.id) ?? []
      // deno-lint-ignore no-explicit-any
      const aw = a as unknown as { findings: string | null; recommendations: string | null; risk_notes: string | null; finding_classification: string | null }
      aw.findings = fs.map((f) => f.description).join('\n\n') || null
      aw.recommendations = fs.filter((f) => f.recommendation).map((f, i) => `${i + 1}. ${f.recommendation}`).join('\n') || null
      aw.risk_notes = fs.filter((f) => f.risk).map((f) => f.risk).join('\n\n') || null
      aw.finding_classification = fs.length === 0
        ? null
        : fs.reduce<string>((acc, f) => ((SEVERITY[f.classification] ?? 0) > (SEVERITY[acc] ?? 0) ? f.classification : acc), fs[0].classification)
    }
  }

  // 4. Client (cabinet_clients lié à la mission)
  let client: CabinetClient | null = null
  let cabinetClientId: string | null = null
  if (mission.client_id) {
    const { data: clientRow } = await supabase
      .from('cabinet_clients')
      .select('*')
      .eq('client_organization_id', mission.client_id)
      .eq('cabinet_id', mission.cabinet_id)
      .maybeSingle()
    client = (clientRow as CabinetClient | null) ?? null
    cabinetClientId = client?.id ?? null
  }

  // 5. Contacts client (RSSI / approver — distribution list côté client)
  let clientContacts: ClientContact[] = []
  if (cabinetClientId) {
    const { data: contactRows } = await supabase
      .from('client_portal_contacts')
      .select('id, contact_name, email, job_title, portal_status')
      .eq('cabinet_client_id', cabinetClientId)
      .order('created_at')
    clientContacts = ((contactRows ?? []) as unknown as ClientContact[])
  }

  // 6. Cabinet : nom + adresse pour l'en-tête de la lettre
  const { data: cabinetRow } = await supabase
    .from('organizations')
    .select('name, address, city, country, phone, website')
    .eq('id', mission.cabinet_id)
    .single()
  const cabRow = cabinetRow as { name: string; address: string | null; city: string | null; country: string | null; phone: string | null; website: string | null } | null
  const cabinetName = cabRow?.name ?? 'Cabinet'
  const cabinetAddress = cabRow ? [cabRow.address, [cabRow.city, cabRow.country].filter(Boolean).join(' — ')].filter(Boolean).join('\n') : null
  const cabinetPhone = cabRow?.phone ?? null
  const cabinetWebsite = cabRow?.website ?? null

  // 7. Branding cabinet (logo)
  const { data: branding } = await supabase
    .from('organization_branding')
    .select('logo_light_url, logo_dark_url, primary_color, accent_color, support_email, footer_text')
    .eq('organization_id', mission.cabinet_id)
    .maybeSingle()
  const br = branding as {
    logo_light_url: string | null; logo_dark_url: string | null;
    primary_color: string | null; accent_color: string | null;
    support_email: string | null; footer_text: string | null
  } | null

  // 8. Documents (preuves examinées) — annexe B
  const { data: docRows } = await supabase
    .from('documents')
    .select('id, file_name, document_type, created_at')
    .eq('mission_id', mission.id)
    .order('created_at', { ascending: false })
    .limit(200)
  const evidenceDocs = ((docRows ?? []) as unknown as EvidenceDoc[])

  return {
    mission, members, domains, assessments,
    client, clientContacts,
    cabinetName,
    cabinetLogoUrl: br?.logo_light_url ?? null,
    cabinetLogoDarkUrl: br?.logo_dark_url ?? null,
    cabinetAddress, cabinetPhone, cabinetWebsite,
    cabinetSupportEmail: br?.support_email ?? null,
    cabinetFooterText: br?.footer_text ?? null,
    cabinetPrimaryColor: br?.primary_color ?? null,
    cabinetAccentColor: br?.accent_color ?? null,
    evidenceDocs,
  }
}
