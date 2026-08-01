/// <reference lib="webworker" />
import { buildAuditReportPdfBlob, type AuditReportData } from './generateAuditReportPDF'

export type AuditReportWorkerResponse =
  | { ok: true; blob: Blob; filename: string }
  | { ok: false; error: string }

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = async (event: MessageEvent<AuditReportData>): Promise<void> => {
  try {
    const { blob, filename } = await buildAuditReportPdfBlob(event.data)
    const response: AuditReportWorkerResponse = { ok: true, blob, filename }
    ctx.postMessage(response)
  } catch (err) {
    const response: AuditReportWorkerResponse = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
    ctx.postMessage(response)
  }
}
