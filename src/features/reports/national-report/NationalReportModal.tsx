import { useEffect, useState } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { X, Download } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { NationalReportDocument } from './NationalReportDocument'
import { renderNationalReport } from './renderNationalReport'
import type { NationalReportInput, NationalRegulSummary, NationalRiskSummary, ReportVariant } from './model'

const VARIANTS: { v: ReportVariant; label: string }[] = [
  { v: 'global', label: 'Global' }, { v: 'regul', label: 'Regul' }, { v: 'risk', label: 'Risk' },
]

const AUTHORITY = 'Autorité nationale de cybersécurité'
const YEARS = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2]

export default function NationalReportModal({ onClose }: { onClose: () => void }): JSX.Element {
  const [year, setYear] = useState(YEARS[0])
  const [variant, setVariant] = useState<ReportVariant>('global')
  const [input, setInput] = useState<NationalReportInput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const ac = new AbortController()
    let active = true
    setInput(null); setError(null)
    void (async () => {
      const args = { p_from: `${year}-01-01`, p_to: `${year}-12-31` }
      const [regul, risk] = await Promise.all([
        supabase.rpc('get_national_regul_summary', args).abortSignal(ac.signal),
        supabase.rpc('get_national_risk_summary', args).abortSignal(ac.signal),
      ])
      if (!active) return
      if (regul.error || risk.error) {
        console.error('[national-report]', regul.error?.message ?? risk.error?.message)
        setError('Génération du rapport impossible')
        return
      }
      setInput({
        regul: regul.data as unknown as NationalRegulSummary,
        risk: risk.data as unknown as NationalRiskSummary,
        authorityName: AUTHORITY,
        periodLabel: `Exercice ${year}`,
        generatedAt: new Date().toISOString(),
        variant,
      })
    })()
    return () => { active = false; ac.abort() }
  }, [year, variant])

  const download = async (): Promise<void> => {
    if (!input) return
    setDownloading(true)
    try { await renderNationalReport(input) } finally { setDownloading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col p-4" onClick={onClose}>
      <div className="bg-white rounded-xl flex flex-col flex-1 overflow-hidden max-w-5xl w-full mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Rapport de supervision nationale</h3>
          <div className="flex items-center gap-2">
            <select value={variant} onChange={(e) => setVariant(e.target.value as ReportVariant)}
              className="px-2.5 py-2 text-[13px] border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700">
              {VARIANTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="px-2.5 py-2 text-[13px] border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700">
              {YEARS.map((y) => <option key={y} value={y}>Exercice {y}</option>)}
            </select>
            <button onClick={() => void download()} disabled={!input || downloading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
              <Download size={15} /> {downloading ? 'Téléchargement...' : 'Télécharger'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fermer"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-gray-100 flex items-center justify-center">
          {error ? <p className="text-[13px] text-red-600">{error}</p>
            : !input ? <LoadingSpinner />
            : <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }} showToolbar={false}>
                <NationalReportDocument input={input} />
              </PDFViewer>}
        </div>
      </div>
    </div>
  )
}
