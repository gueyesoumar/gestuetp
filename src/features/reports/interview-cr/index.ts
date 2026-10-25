import type { InterviewSchedule, ClientContact } from '../../../types/database.types'

// Type partage du compte-rendu d'entretien, consomme par le moteur react-pdf v2.
// Le moteur jsPDF v1 a ete retire (RFC 0021 Lot 4).
export interface CRData {
  interview: InterviewSchedule
  contact: ClientContact | undefined
  auditorName: string
  missionName: string
  rawNotes: string
  controlCodes: string[]
}
