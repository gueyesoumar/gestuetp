// Helper partage du compte-rendu d'entretien (reutilise par le moteur react-pdf v2).
// Le moteur jsPDF v1 a ete retire (RFC 0021 Lot 4).

export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
