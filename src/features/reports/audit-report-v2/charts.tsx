import { Svg, Polygon, Line, Circle, Rect, Text } from '@react-pdf/renderer'
import type { AssessmentWithControl, DomainStat } from '../audit-report/context'
import type { AuditReportData } from '../generateAuditReportPDF'
import type { ReportTheme } from './report-model'

// Graphiques du rapport v2 en SVG react-pdf (equivalents vectoriels du moteur jsPDF).

const fmt = (n: number): string => n.toFixed(1)

export function RadarChart({ stats, theme, size = 190 }: { stats: DomainStat[]; theme: ReportTheme; size?: number }): JSX.Element {
  const n = Math.max(3, stats.length)
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 20
  const vertex = (i: number, r: number): [number, number] => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }
  const ring = (ratio: number): string =>
    Array.from({ length: n }, (_, i) => vertex(i, radius * ratio)).map((p) => `${fmt(p[0])},${fmt(p[1])}`).join(' ')
  const dataPts = stats.map((d, i) => vertex(i, radius * (Math.max(0, Math.min(100, d.score)) / 100)))
  const dataStr = dataPts.map((p) => `${fmt(p[0])},${fmt(p[1])}`).join(' ')

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <Polygon key={r} points={ring(r)} fill="none" stroke="#e5e7eb" strokeWidth={0.4} />
      ))}
      {Array.from({ length: n }, (_, i) => vertex(i, radius)).map((p, i) => (
        <Line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="#e5e7eb" strokeWidth={0.4} />
      ))}
      {stats.length >= 3 && <Polygon points={dataStr} fill={theme.accent} fillOpacity={0.25} stroke={theme.accent} strokeWidth={1} />}
      {dataPts.map((p, i) => <Circle key={i} cx={p[0]} cy={p[1]} r={1.6} fill={theme.accent} />)}
      {stats.map((d, i) => {
        const [lx, ly] = vertex(i, radius + 9)
        return <Text key={d.code} x={lx} y={ly} fill="#6b7280" textAnchor="middle" style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>{d.code}</Text>
      })}
    </Svg>
  )
}

const clamp = (n: number, lo = 0, hi = 1): number => (n < lo ? lo : n > hi ? hi : n)
const hashStr = (s: string): number => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function PriorityMatrix({ items, data, width = 174, height = 96 }: {
  items: AssessmentWithControl[]
  data: AuditReportData & { domainStats: DomainStat[] }
  width?: number
  height?: number
}): JSX.Element {
  const padL = 16, padR = 6, padT = 14, padB = 14
  const ix = padL, iy = padT, iw = width - padL - padR, ih = height - padT - padB
  const domScore = new Map<string, number>()
  for (const d of data.domainStats) {
    const dom = data.domains.find((dd) => dd.code === d.code)
    for (const c of dom?.controls ?? []) domScore.set(c.id, d.score)
  }
  const dot = (a: AssessmentWithControl): { px: number; py: number; color: string } => {
    const baseImpact = a.finding_classification === 'major_nc' ? 0.85 : a.finding_classification === 'minor_nc' ? 0.55 : a.finding_classification === 'observation' ? 0.30 : 0.5
    const impact = clamp(baseImpact + (100 - (domScore.get(a.control_id) ?? 75)) / 400 + ((hashStr(a.id + 'i') % 20) - 10) / 200)
    const effort = clamp(clamp(0.25 + (a.recommendations ?? '').length / 700) + ((hashStr(a.id + 'e') % 40) - 20) / 200)
    return {
      px: ix + iw * clamp(effort, 0.08, 0.92),
      py: iy + ih * (1 - clamp(impact, 0.08, 0.92)),
      color: a.finding_classification === 'major_nc' ? '#b91c1c' : a.finding_classification === 'minor_nc' ? '#c2410c' : '#2563eb',
    }
  }
  const lbl = { fontSize: 6.5, fontFamily: 'Helvetica-Bold' as const }
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={0} y={0} width={width} height={height} rx={2} fill="#ffffff" stroke="#e5e7eb" strokeWidth={0.5} />
      <Rect x={ix} y={iy} width={iw / 2} height={ih / 2} fill="#fbf7eb" />
      <Rect x={ix + iw / 2} y={iy} width={iw / 2} height={ih / 2} fill="#f0fdf4" />
      <Rect x={ix} y={iy + ih / 2} width={iw / 2} height={ih / 2} fill="#f3f4f6" />
      <Rect x={ix + iw / 2} y={iy + ih / 2} width={iw / 2} height={ih / 2} fill="#fef2f2" />
      <Line x1={ix} y1={iy + ih / 2} x2={ix + iw} y2={iy + ih / 2} stroke="#9ca3af" strokeWidth={0.4} />
      <Line x1={ix + iw / 2} y1={iy} x2={ix + iw / 2} y2={iy + ih} stroke="#9ca3af" strokeWidth={0.4} />
      <Text x={4} y={10} fill="#6b7280" style={lbl}>IMPACT (+)</Text>
      <Text x={width - 4} y={height - 5} fill="#6b7280" textAnchor="end" style={lbl}>EFFORT (+)</Text>
      <Text x={ix + 2} y={iy + 5} fill="#6b7280" style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>Gains rapides</Text>
      <Text x={ix + iw - 2} y={iy + 5} fill="#6b7280" textAnchor="end" style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>Stratégique</Text>
      <Text x={ix + 2} y={iy + ih - 2} fill="#6b7280" style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>Faible enjeu</Text>
      <Text x={ix + iw - 2} y={iy + ih - 2} fill="#6b7280" textAnchor="end" style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>Coûteux</Text>
      {items.map((a) => { const d = dot(a); return <Circle key={a.id} cx={d.px} cy={d.py} r={1.6} fill={d.color} /> })}
    </Svg>
  )
}
