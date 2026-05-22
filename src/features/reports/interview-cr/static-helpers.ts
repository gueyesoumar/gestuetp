import type jsPDF from 'jspdf'

export function sectionHeader(doc: jsPDF, x: number, y: number, w: number, title: string): void {
  doc.setFillColor(27, 67, 50)
  doc.roundedRect(x, y, w, 8, 1.5, 1.5, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(title, x + 5, y + 5.5)
}

export function infoField(doc: jsPDF, x: number, y: number, label: string, value: string): void {
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(107, 114, 128)
  doc.text(label, x, y)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(26, 26, 26)
  doc.text(value.slice(0, 40), x, y + 5)
}

export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
