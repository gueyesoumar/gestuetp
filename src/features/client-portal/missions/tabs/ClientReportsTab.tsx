import { useState, useEffect } from 'react'
import { FileText, Download } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import type { ClientMissionDetail } from '../useClientMissionDetail'

interface ReportData {
  id: string
  title: string
  fileSize: number | null
  filePath: string
  createdAt: string
}

interface HistoryEntry {
  id: string
  year: number
  frameworkName: string
  score: number | null
  findingsCount: number | null
}

interface Props {
  mission: ClientMissionDetail
}

export function ClientReportsTab({ mission }: Props): JSX.Element {
  const [reports, setReports] = useState<ReportData[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setLoading(true)
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) { setLoading(false); return }

      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = { 'apikey': apikey, 'Authorization': `Bearer ${token}` }

      // Fetch reports
      const repRes = await fetch(
        `${baseUrl}/rest/v1/reports?mission_id=eq.${mission.id}&select=id,title,file_size,file_path,created_at&order=created_at.desc`,
        { headers }
      )
      if (repRes.ok) {
        const data = await repRes.json() as Record<string, unknown>[]
        setReports(data.map((r) => ({
          id: r.id as string,
          title: (r.title as string) ?? 'Rapport',
          fileSize: (r.file_size as number) ?? null,
          filePath: (r.file_path as string) ?? '',
          createdAt: r.created_at as string,
        })))
      }

      // Fetch audit history (via cabinet_client_id from user)
      const histRes = await fetch(
        `${baseUrl}/rest/v1/audit_history?select=id,year,framework_name,score,findings_count&order=year.desc`,
        { headers }
      )
      if (histRes.ok) {
        const data = await histRes.json() as Record<string, unknown>[]
        setHistory(data.map((h) => ({
          id: h.id as string,
          year: h.year as number,
          frameworkName: (h.framework_name as string) ?? '',
          score: (h.score as number) ?? null,
          findingsCount: (h.findings_count as number) ?? null,
        })))
      }

      setLoading(false)
    }

    fetchData()
  }, [mission.id])

  const handleDownload = async (filePath: string, title: string): Promise<void> => {
    const { data, error: signError } = await supabase.storage.from('reports').createSignedUrl(filePath, 300)
    if (signError || !data?.signedUrl) {
      alert('Impossible de t\u00e9l\u00e9charger le rapport. Le fichier est peut-\u00eatre indisponible.')
      return
    }
    const a = document.createElement('a')
    a.href = data.signedUrl
    a.download = title
    a.click()
  }

  if (loading) {
    return <p className="text-xs text-gray-400 text-center py-8">Chargement...</p>
  }

  return (
    <div className="space-y-8">
      {/* ═══ Livrables ═══ */}
      <section>
        <p className="text-sm font-bold mb-3">Livrables</p>
        {reports.length > 0 ? (
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl bg-white">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0"><FileText size={20} className="text-red-400" /></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{r.title}</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">
                    {r.fileSize ? `${(r.fileSize / 1024 / 1024).toFixed(1)} Mo` : ''}
                    {r.createdAt ? ` \u00b7 ${new Date(r.createdAt).toLocaleDateString('fr-FR')}` : ''}
                  </p>
                </div>
                <button onClick={() => handleDownload(r.filePath, r.title)}
                  className="px-4 py-2 bg-forest-700 text-white rounded-lg text-xs font-semibold hover:bg-forest-900 transition-colors shrink-0">
                  <Download size={13} className="inline mr-1" />T&eacute;l&eacute;charger
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-xs text-gray-400">Les rapports seront disponibles apr&egrave;s la cl&ocirc;ture de la mission.</p>
          </div>
        )}
      </section>

      {/* ═══ Historique ═══ */}
      <section>
        <p className="text-sm font-bold mb-3">&Eacute;volution dans le temps</p>
        {history.length > 0 ? (
          <>
            {/* Score bars */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
              <div className="flex items-end gap-5 h-32 px-4 border-b border-gray-100">
                {history.slice().reverse().map((h) => {
                  const pct = h.score ?? 0
                  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-forest-500' : pct >= 40 ? 'bg-gold-500' : 'bg-red-400'
                  return (
                    <div key={h.id} className="flex-1 flex flex-col items-center gap-1">
                      <span className={`text-[11px] font-bold ${pct >= 60 ? 'text-forest-700' : pct >= 40 ? 'text-gold-600' : 'text-red-500'}`}>
                        {h.score !== null ? `${h.score}%` : '?'}
                      </span>
                      <div className={`w-full ${color} rounded-t-md`} style={{ height: `${Math.max(pct * 1.1, 8)}px`, opacity: 0.8 }} />
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-5 px-4 pt-2">
                {history.slice().reverse().map((h) => (
                  <span key={h.id} className="flex-1 text-center text-[10px] text-gray-400">{h.year}</span>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-100 bg-gray-50/50">
                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase text-gray-400">Ann&eacute;e</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase text-gray-400">R&eacute;f&eacute;rentiel</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-semibold uppercase text-gray-400">Score</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-semibold uppercase text-gray-400">Constats</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-gray-50">
                      <td className="px-3 py-2.5 font-semibold">{h.year}</td>
                      <td className="px-3 py-2.5">{h.frameworkName}</td>
                      <td className="px-3 py-2.5 text-center">
                        {h.score !== null ? (
                          <span className={`font-bold ${h.score >= 80 ? 'text-green-600' : h.score >= 60 ? 'text-forest-700' : h.score >= 40 ? 'text-gold-600' : 'text-red-500'}`}>{h.score}%</span>
                        ) : <span className="text-gray-300">&mdash;</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-500">{h.findingsCount ?? '&mdash;'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-xs text-gray-400">L&rsquo;historique des audits pr&eacute;c&eacute;dents appara&icirc;tra ici.</p>
          </div>
        )}
      </section>
    </div>
  )
}
