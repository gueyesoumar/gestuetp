import type { ClientContact, InterviewScheduleInsert } from '../../../types/database.types'
import type { AuditTopicWithControls } from './useAuditTopics'

// Phase C.b : genere une liste d'entretiens depuis la matrice acteurs x sujets.
//
// Regle metier (cf mockup ENTRETIEN 02) : un acteur ayant >=1 sujet coche dans
// la matrice donne lieu a UN entretien regroupant tous ses sujets. Les sujets
// non couverts par aucun acteur sont ignores ici (warnings cote UI).

export interface GeneratedInterview {
  base: InterviewScheduleInsert
  topicIds: string[]
  actorIds: string[]
  // info de monitoring pour l'UI
  topicCount: number
  controlCount: number
  actorName: string
}

export interface MatrixCell {
  actorId: string
  topicId: string
}

export function generateFromMatrix(
  missionId: string,
  actors: ClientContact[],
  topics: AuditTopicWithControls[],
  cells: MatrixCell[],
  defaultAuditorId: string,
  startDate: string | null,
  endDate: string | null
): GeneratedInterview[] {
  const actorsById = new Map(actors.map((a) => [a.id, a]))
  const topicsById = new Map(topics.map((t) => [t.id, t]))

  // Regrouper les sujets coches par acteur
  const topicsByActor = new Map<string, string[]>()
  for (const cell of cells) {
    if (!actorsById.has(cell.actorId) || !topicsById.has(cell.topicId)) continue
    const list = topicsByActor.get(cell.actorId) ?? []
    list.push(cell.topicId)
    topicsByActor.set(cell.actorId, list)
  }

  const actorIds = [...topicsByActor.keys()]
  if (actorIds.length === 0) return []

  const dates = generateDates(startDate, endDate, actorIds.length)

  return actorIds.map((actorId, idx) => {
    const actor = actorsById.get(actorId)!
    const topicIds = topicsByActor.get(actorId)!
    const linkedTopics = topicIds.map((tid) => topicsById.get(tid)!).filter(Boolean)
    const totalControls = new Set(linkedTopics.flatMap((t) => t.control_ids)).size

    // Duree : 30 min par sujet, plancher 60 min, plafond 180 min
    const duration = Math.min(180, Math.max(60, topicIds.length * 30))

    const titleTopics = linkedTopics.slice(0, 2).map((t) => t.name).join(' + ')
    const titleSuffix = linkedTopics.length > 2 ? ` (+${linkedTopics.length - 2})` : ''
    const title = `${actor.name} — ${titleTopics}${titleSuffix}`

    return {
      base: {
        mission_id: missionId,
        auditor_id: defaultAuditorId,
        title,
        scheduled_date: dates[idx],
        scheduled_time: idx % 2 === 0 ? '09:00:00' : '14:00:00',
        duration_minutes: duration,
        status: 'scheduled',
      },
      topicIds,
      actorIds: [actorId],
      topicCount: topicIds.length,
      controlCount: totalControls,
      actorName: actor.name,
    }
  })
}

// Repartit count entretiens entre 20% et 70% de la timeline mission, en evitant
// les week-ends (decale au lundi suivant).
function generateDates(start: string | null, end: string | null, count: number): string[] {
  const startDate = start ? new Date(start) : new Date()
  const endDate = end ? new Date(end) : new Date(startDate.getTime() + 30 * 86400000)
  const missionDays = Math.max(7, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000))
  const interviewStart = new Date(startDate.getTime() + missionDays * 0.2 * 86400000)
  const interviewEnd = new Date(startDate.getTime() + missionDays * 0.7 * 86400000)
  const interviewDays = Math.max(5, Math.ceil((interviewEnd.getTime() - interviewStart.getTime()) / 86400000))

  const dates: string[] = []
  for (let i = 0; i < count; i++) {
    const dayOffset = Math.round((i / Math.max(1, count - 1)) * interviewDays)
    const date = new Date(interviewStart.getTime() + dayOffset * 86400000)
    const dow = date.getDay()
    if (dow === 0) date.setDate(date.getDate() + 1)
    if (dow === 6) date.setDate(date.getDate() + 2)
    dates.push(date.toISOString().slice(0, 10))
  }
  return dates
}

// Calcule la couverture des sujets : combien de sujets selectionnes ne sont pas
// couverts par au moins un acteur. Utile pour avertir l'auditeur.
export function computeMatrixCoverage(
  selectedTopicIds: string[],
  cells: MatrixCell[]
): { coveredTopicIds: Set<string>; uncoveredTopicIds: string[] } {
  const covered = new Set(cells.map((c) => c.topicId))
  const uncovered = selectedTopicIds.filter((tid) => !covered.has(tid))
  return { coveredTopicIds: covered, uncoveredTopicIds: uncovered }
}
