import type { AuditReportData } from './generateAuditReportPDF'
import type { AuditReportWorkerResponse } from './auditReportPdf.worker'

/**
 * Lance la generation du rapport d'audit dans un Web Worker dedie pour ne pas
 * bloquer le main thread pendant les ~1-3s de rendu jsPDF. Le worker fait
 * tout le travail CPU (fetch logos, dessin pages), le main thread se contente
 * de declencher le download du blob recu.
 */
export async function runAuditReportPdfInWorker(data: AuditReportData): Promise<void> {
  const worker = new Worker(new URL('./auditReportPdf.worker.ts', import.meta.url), { type: 'module' })

  try {
    const result = await new Promise<{ blob: Blob; filename: string }>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<AuditReportWorkerResponse>) => {
        if (event.data.ok) resolve({ blob: event.data.blob, filename: event.data.filename })
        else reject(new Error(event.data.error))
      }
      worker.onerror = (event) => {
        reject(new Error(event.message || 'Audit report worker failed'))
      }
      worker.postMessage(data)
    })

    triggerDownload(result.blob, result.filename)
  } finally {
    worker.terminate()
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
