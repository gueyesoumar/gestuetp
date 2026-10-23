import { useState } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { X, Download } from 'lucide-react'
import type { AuditReportData } from '../generateAuditReportPDF'
import { AuditReportDocument } from './AuditReportDocument'
import { renderAuditReportV2 } from './renderAuditReportV2'

// Apercu in-app (D-REP-3) : le VRAI PDF rendu dans une iframe (meme moteur que
// l'export), pour relire avant diffusion. Export par defaut -> charge en React.lazy
// depuis MissionClosureTab afin que react-pdf reste hors du bundle initial.
export default function AuditReportV2Modal({ data, onClose }: { data: AuditReportData; onClose: () => void }): JSX.Element {
  const [downloading, setDownloading] = useState(false)

  const download = async (): Promise<void> => {
    setDownloading(true)
    try { await renderAuditReportV2(data) } finally { setDownloading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col p-4" onClick={onClose}>
      <div className="bg-white rounded-xl flex flex-col flex-1 overflow-hidden max-w-5xl w-full mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Aper{'ç'}u du rapport d{'’'}audit</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => void download()} disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
              <Download size={15} /> {downloading ? 'Téléchargement...' : 'Télécharger'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fermer"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 bg-gray-100">
          <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }} showToolbar={false}>
            <AuditReportDocument data={data} />
          </PDFViewer>
        </div>
      </div>
    </div>
  )
}
