import { supabase } from '../../lib/supabase'
import type { MissionDetail, MissionMemberRow } from '../missions/useMissionDetail'
import type { DomainWithControls } from '../frameworks/useFrameworkDetail'
import type { CabinetClient } from '../../types/database.types'
import type { AssessmentWithControl, AuditReportData } from './generateAuditReportPDF'

/**
 * Charge en une fois toutes les données nécessaires au rapport d'audit PDF.
 * Appelé à la demande (au clic du bouton "Rapport PDF") plutôt que de
 * surcharger le chargement initial de la page Clôture.
 */
export async function loadAuditReportData(mission: MissionDetail): Promise<AuditReportData> {
  // 1. Membres de la mission (avec user)
  const { data: membersRaw } = await supabase
    .from('mission_members')
    .select('id, mission_id, user_id, role, user:users(id, first_name, last_name, email)')
    .eq('mission_id', mission.id)

  const members = (membersRaw ?? []) as unknown as MissionMemberRow[]

  // 2. Domaines + contrôles du framework
  const { data: domainRows } = await supabase
    .from('domains')
    .select('id, code, name, sort_order, controls(id, code, name, sort_order, domain_id)')
    .eq('framework_id', mission.framework_id)
    .order('sort_order')

  const domains: DomainWithControls[] = ((domainRows ?? []) as unknown as Array<{
    id: string; code: string; name: string; sort_order: number;
    controls: Array<{ id: string; code: string; name: string; sort_order: number; domain_id: string }>
  }>).map((d) => ({
    ...d,
    controls: [...(d.controls ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  }))

  // 3. Assessments avec contrôle joint
  const { data: assessRaw } = await supabase
    .from('control_assessments')
    .select('*, control:controls(id, code, name, domain_id)')
    .eq('mission_id', mission.id)

  const assessments = (assessRaw ?? []) as unknown as AssessmentWithControl[]

  // 4. Client (cabinet_clients lié à la mission)
  let client: CabinetClient | null = null
  if (mission.client_id) {
    const { data: clientRow } = await supabase
      .from('cabinet_clients')
      .select('*')
      .eq('client_organization_id', mission.client_id)
      .eq('cabinet_id', mission.cabinet_id)
      .maybeSingle()
    client = (clientRow as CabinetClient | null) ?? null
  }

  // 5. Branding du cabinet (logo)
  const { data: cabinetRow } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', mission.cabinet_id)
    .single()
  const cabinetName = (cabinetRow as { name: string } | null)?.name ?? 'Cabinet'

  const { data: branding } = await supabase
    .from('organization_branding')
    .select('logo_light_url')
    .eq('organization_id', mission.cabinet_id)
    .maybeSingle()
  const cabinetLogoUrl = (branding as { logo_light_url: string | null } | null)?.logo_light_url ?? null

  return {
    mission, members, domains, assessments, client, cabinetName, cabinetLogoUrl,
  }
}
