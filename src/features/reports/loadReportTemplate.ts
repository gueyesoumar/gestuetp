import { supabase } from '../../lib/supabase'

export interface ResolvedTemplate {
  sections: { key: string; visible: boolean; options?: Record<string, unknown> }[]
  texts: Record<string, string> | null
}

// Resout le modele applicable a un document : modele client (si defini) sinon modele
// par defaut du cabinet, pour le type de document donne. null = ordre integre par
// defaut. Partage par tous les documents du moteur react-pdf (RFC 0021 E2).
export async function loadReportTemplate(
  cabinetId: string, clientId: string | null, documentType: string,
): Promise<ResolvedTemplate | null> {
  const { data, error } = await supabase
    .from('report_templates')
    .select('scope, client_id, is_default, sections, texts')
    .eq('organization_id', cabinetId)
    .eq('document_type', documentType)
  if (error) { console.error('[loadReportTemplate]', error.message); return null }
  if (!data || data.length === 0) return null
  const rows = data as Array<{ scope: string; client_id: string | null; is_default: boolean; sections: ResolvedTemplate['sections']; texts: Record<string, string> | null }>
  const chosen = rows.find((t) => t.scope === 'client' && t.client_id === clientId) ?? rows.find((t) => t.scope === 'cabinet' && t.is_default)
  return chosen ? { sections: chosen.sections, texts: chosen.texts } : null
}

/** Variante quand seul l'id de mission est connu (ex: CR d'entretien) : resout
 *  d'abord le cabinet et le client de la mission. */
export async function loadReportTemplateForMission(missionId: string, documentType: string): Promise<ResolvedTemplate | null> {
  const { data, error } = await supabase
    .from('missions')
    .select('cabinet_id, client_id')
    .eq('id', missionId)
    .single()
  if (error || !data) { if (error) console.error('[loadReportTemplateForMission]', error.message); return null }
  const m = data as { cabinet_id: string; client_id: string | null }
  return loadReportTemplate(m.cabinet_id, m.client_id, documentType)
}
