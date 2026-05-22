import jsPDF from 'jspdf'
import { createContext, type ScopingNoteData as _ScopingNoteData } from './context'
import { drawCoverPage } from './cover'
import { loadImageAsDataURL } from './logo-loader'
import {
  drawSection01Preambule, drawSection02Objectifs, drawSection03Perimetre,
  drawSection04Methodologie, drawSection05Risques, drawSection06Equipe,
  drawSection07Planning, drawSection08LivrablesGouvernance,
  drawSection09Hypotheses, drawSection10Signatures,
} from './sections'

export type ScopingNoteData = _ScopingNoteData

/**
 * Générateur PDF de la Note de Cadrage — visuel "Mockup B révisé".
 *
 * Toutes les données sont tirées de la BDD existante (missions,
 * cabinet_clients, mission_members, mission_risks, mission_exclusions,
 * domains, framework). Les sections de méthodologie / RACI / hypothèses
 * sont des templates standards du cabinet enrichis automatiquement à
 * partir du contexte (framework, réglementations, secteur).
 */
export async function generateScopingNotePDF(data: ScopingNoteData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ctx = createContext(doc, data)

  // Pré-charge le logo client (best effort — silencieux si KO)
  const clientLogo = data.client?.logo_url ? await loadImageAsDataURL(data.client.logo_url) : null

  drawCoverPage(ctx, clientLogo)

  drawSection01Preambule(ctx)
  drawSection02Objectifs(ctx)
  drawSection03Perimetre(ctx)
  drawSection04Methodologie(ctx)
  drawSection05Risques(ctx)
  drawSection06Equipe(ctx)
  drawSection07Planning(ctx)
  drawSection08LivrablesGouvernance(ctx)
  drawSection09Hypotheses(ctx)
  drawSection10Signatures(ctx)

  const safeName = data.mission.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60)
  doc.save(`Note_cadrage_${safeName}.pdf`)
}
