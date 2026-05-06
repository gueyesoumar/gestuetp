import type { PvTemplate, PvTemplateSection } from '../../../types/database.types'
import type { AuditTopicWithControls } from './useAuditTopics'

// Construit le canevas du PV pre-rempli a partir des sujets selectionnes pour
// un entretien. Pour chaque sujet : son nom, les codes des controles couverts
// et les questions-cle (audit_topics.default_questions).
//
// Ce template est fige au moment de la creation de l'entretien et stocke dans
// interview_schedules.pv_template. La saisie ulterieure se fait dans pv_notes.
export function buildPvTemplate(
  selectedTopicIds: string[],
  allTopics: AuditTopicWithControls[],
  controlIdToCode: Map<string, string>
): PvTemplate {
  const byId = new Map(allTopics.map((t) => [t.id, t]))
  const sections: PvTemplateSection[] = []
  for (const tid of selectedTopicIds) {
    const topic = byId.get(tid)
    if (!topic) continue
    const codes = topic.control_ids
      .map((id) => controlIdToCode.get(id))
      .filter((c): c is string => Boolean(c))
      .sort()
    sections.push({
      topic_id: topic.id,
      topic_name: topic.name,
      control_codes: codes,
      questions: topic.default_questions ?? [],
    })
  }
  return { sections }
}
