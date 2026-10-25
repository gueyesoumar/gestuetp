import type { MissionDetail, MissionMemberRow } from '../../missions/useMissionDetail'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { CabinetClient, MissionExclusion, MissionRisk } from '../../../types/database.types'

// Type + calcul de la note de cadrage, PARTAGES par le moteur react-pdf v2. Le moteur
// jsPDF v1 a ete retire (RFC 0021 Lot 4) : plus de dependance PDF ici.

export interface ScopingNoteData {
  mission: MissionDetail
  members: MissionMemberRow[]
  domains: DomainWithControls[]
  exclusions: MissionExclusion[]
  risks: MissionRisk[]
  client: CabinetClient | null
  questionnaireProgress: number
  documentsReceived: number
  documentsExpected: number
  reviewLabels?: { lead: string; associate: string }
}

export function computeDurationWeeks(start: string | null, end: string | null): number {
  if (!start || !end) return 0
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24 * 7)))
}
