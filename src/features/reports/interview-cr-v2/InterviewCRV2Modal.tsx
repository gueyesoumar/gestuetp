import { useState } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { X, Download } from 'lucide-react'
import { InterviewCRDocument } from './InterviewCRDocument'
import { renderInterviewCRV2 } from './renderInterviewCRV2'
import type { CRData } from '../interview-cr'

type CRInput = CRData & {
  templateSections?: { key: string; visible: boolean; options?: Record<string, unknown> }[] | null
  templateTexts?: Record<string, string> | null
}

// Apercu in-app du compte-rendu d'entretien v2 (vrai PDF en iframe blob). Charge en
// React.lazy depuis InterviewEditModal pour que react-pdf reste hors bundle. E2.2.
export default function InterviewCRV2Modal({ data, onClose }: { data: CRInput; onClose: () => void }): JSX.Element {
  const [downloading, setDownloading] = useState(false)
  const download = async (): Promise<void> => {
    setDownloading(true)
    try { await renderInterviewCRV2(data) } finally { setDownloading(false) }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col p-4" onClick={onClose}>
      <div className="bg-white rounded-xl flex flex-col flex-1 overflow-hidden max-w-5xl w-full mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Aper{'ç'}u du compte-rendu</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => void download()} disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
              <Download size={15} /> {downloading ? 'Téléchargement...' : 'Télécharger'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fermer"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-gray-100">
          <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }} showToolbar={false}>
            <InterviewCRDocument data={data} />
          </PDFViewer>
        </div>
      </div>
    </div>
  )
}
