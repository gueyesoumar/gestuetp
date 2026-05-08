import type { AssessmentFinding, CorrectiveActionRequest, FindingClassification } from '../../types/database.types'

export interface ActionPlanCAR extends CorrectiveActionRequest {
  domain_name?: string | null
  /** Finding source de verite (resolu via finding_id). null pour les CARs legacy. */
  finding?: AssessmentFinding | null
}

/**
 * Classification effective d'une CAR : finding (source de verite) sinon denorm legacy.
 * Le denorm sur corrective_action_requests.finding_classification reste utilise comme
 * fallback pour les CARs creees avant le backfill 00100 ou si la jointure echoue.
 */
export function getEffectiveClassification(car: ActionPlanCAR): FindingClassification | null {
  if (car.finding) return car.finding.classification
  const legacy = car.finding_classification
  if (legacy === 'major_nc' || legacy === 'minor_nc' || legacy === 'observation' || legacy === 'strength') {
    return legacy
  }
  return null
}

export interface ActionPlanXLSXData {
  missionName: string
  clientName: string
  frameworkLabel: string
  reportDate: string
  brandPrimary: string
  brandAccent: string
  cars: ActionPlanCAR[]
}

const CLASS_LABEL: Record<string, string> = {
  major_nc: 'NC majeure',
  minor_nc: 'NC mineure',
  observation: 'Observation',
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Ouvert',
  client_responded: 'Répondu',
  verified: 'Vérifié',
  closed: 'Clôturé',
}

const VERIF_LABEL: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  rejected: 'Rejetée',
}

function hexToArgb(hex: string, alpha = 'FF'): string {
  const h = hex.replace('#', '').padEnd(6, '0').slice(0, 6).toUpperCase()
  return `${alpha}${h}`
}

function formatDate(d: string | null): string {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function generateActionPlanXLSX(data: ActionPlanXLSXData): Promise<void> {
  const { default: ExcelJS } = await import('exceljs')

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Gëstu Comply'
  wb.created = new Date()

  const ws = wb.addWorksheet("Plan d'action", {
    views: [{ state: 'frozen', ySplit: 4 }],
  })

  const primary = hexToArgb(data.brandPrimary)
  const accent = hexToArgb(data.brandAccent)

  // En-tête mission
  ws.mergeCells('A1:J1')
  const titleCell = ws.getCell('A1')
  titleCell.value = `Plan d'action — ${data.missionName}`
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primary } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(1).height = 26

  ws.mergeCells('A2:J2')
  const subCell = ws.getCell('A2')
  subCell.value = `${data.clientName} · ${data.frameworkLabel} · Édité le ${data.reportDate}`
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } }
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(2).height = 18

  ws.getRow(3).height = 6 // séparateur

  // En-têtes
  const headers = [
    'Code',
    'Domaine',
    'Contrôle',
    'Type',
    'Description du constat',
    'Cause racine (client)',
    'Action prévue (client)',
    'Échéance',
    'Statut',
    'Vérification',
  ]
  const headerRow = ws.addRow(headers)
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accent } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    }
  })
  headerRow.height = 28

  // Lignes
  for (const car of data.cars) {
    const ctrl = car.control_code && car.control_name
      ? `${car.control_code} — ${car.control_name}`
      : (car.control_code ?? car.control_name ?? '')
    const classKey = getEffectiveClassification(car) ?? car.finding_classification
    const row = ws.addRow([
      car.code,
      car.domain_name ?? '',
      ctrl,
      CLASS_LABEL[classKey] ?? classKey,
      car.description ?? '',
      car.client_root_cause ?? '',
      car.client_action ?? '',
      formatDate(car.client_target_date ?? car.deadline),
      STATUS_LABEL[car.status] ?? car.status,
      VERIF_LABEL[car.verification_status] ?? car.verification_status,
    ])

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 }
      cell.alignment = {
        vertical: 'top',
        horizontal: colNumber === 1 || colNumber === 4 || colNumber === 8 || colNumber === 9 || colNumber === 10 ? 'center' : 'left',
        wrapText: true,
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        right: { style: 'thin', color: { argb: 'FFEEEEEE' } },
      }
    })

    // Code en gras + couleur primaire
    row.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: primary } }

    // Couleur du badge "Type" selon classification
    const typeCell = row.getCell(4)
    if (classKey === 'major_nc') {
      typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
      typeCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB91C1C' } }
    } else if (classKey === 'minor_nc') {
      typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } }
      typeCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFC2410C' } }
    } else if (classKey === 'observation') {
      typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
      typeCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1D4ED8' } }
    }
  }

  // Largeurs de colonnes
  const widths = [12, 24, 32, 14, 50, 36, 36, 14, 14, 14]
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w })

  // Filtres auto sur la ligne d'en-tête
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 10 } }

  // Téléchargement
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Plan-action-${data.missionName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${data.reportDate.replace(/\//g, '-')}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
