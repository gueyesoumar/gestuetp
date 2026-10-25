import type { CRData } from '../interview-cr'

// Jeu de données FACTICE pour l'aperçu live de l'éditeur (CR d'entretien, RFC 0021
// E2.2). Données d'illustration : jamais persistées, jamais exposées. Cast unique
// justifié. Les notes brutes sont rédigées pour illustrer chaque rubrique du parseur.

const RAW_NOTES = [
  "La politique de sécurité est formalisée et validée par la direction",
  "Les sauvegardes sont réalisées de manière régulière et documentée",
  "Il manque un inventaire à jour des actifs critiques",
  "Aucun test de restauration n'a été réalisé depuis douze mois",
  "Il faut mettre en place une revue trimestrielle des habilitations",
  "Il faut planifier une campagne de sensibilisation des agents",
  "Le registre des traitements doit être transmis à l'équipe d'audit",
  "La charte informatique est à fournir pour analyse",
].join('. ')

export function buildSampleInterviewData(): CRData {
  const sample = {
    interview: {
      id: 'sample-interview', title: 'Entretien RSSI - Gouvernance et exploitation',
      scheduled_date: '2026-03-12', scheduled_time: '10:00:00', duration_minutes: 90,
      location: 'Salle de réunion - Siège',
    },
    contact: { id: 'cc1', name: 'Fatou Fall', job_title: 'RSSI' },
    auditorName: 'Awa Ndiaye',
    missionName: 'Audit SSI - Entité d\'illustration',
    rawNotes: RAW_NOTES,
    controlCodes: ['GOUV-01', 'OPS-01', 'ACCES-01'],
  }
  // Cast unique justifié : données factices d'aperçu, seuls les champs lus par le rendu.
  return sample as unknown as CRData
}
