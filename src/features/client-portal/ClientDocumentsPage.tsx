import { useState, useEffect } from 'react'
import { FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useClientMissions } from './useClientMissions'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

interface AggregatedDoc {
  id: string
  fileName: string
  missionName: string
  missionId: string
  mimeType: string | null
  fileSize: number | null
  createdAt: string
}

export function ClientDocumentsPage(): JSX.Element {
  const { missions, loading: mLoading } = useClientMissions()
  const [docs, setDocs] = useState<AggregatedDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (mLoading || missions.length === 0) { setLoading(false); return }

    const fetchDocs = async (): Promise<void> => {
      setLoading(true)
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) { setLoading(false); return }

      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = { 'apikey': apikey, 'Authorization': `Bearer ${token}` }
      const missionIds = missions.map((m) => m.id)

      const res = await fetch(
        `${baseUrl}/rest/v1/documents?mission_id=in.(${missionIds.join(',')})&select=id,file_name,mission_id,mime_type,file_size,created_at&order=created_at.desc&limit=50`,
        { headers }
      )

      if (res.ok) {
        const data = await res.json() as Record<string, unknown>[]
        const missionMap = Object.fromEntries(missions.map((m) => [m.id, m.name]))
        setDocs(data.map((d) => ({
          id: d.id as string,
          fileName: d.file_name as string,
          missionName: missionMap[d.mission_id as string] ?? '',
          missionId: d.mission_id as string,
          mimeType: (d.mime_type as string) ?? null,
          fileSize: (d.file_size as number) ?? null,
          createdAt: d.created_at as string,
        })))
      }
      setLoading(false)
    }

    fetchDocs()
  }, [missions, mLoading])

  if (loading || mLoading) return <LoadingSpinner />

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Documents</h1>
      <p className="text-sm text-gray-400 mb-5">Tous les documents d&eacute;pos&eacute;s, toutes missions confondues</p>

      {docs.length > 0 ? (
        <div className="space-y-1.5">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2.5 px-3 py-2.5 border border-gray-200 rounded-lg bg-white">
              <FileText size={16} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{doc.fileName}</p>
                <p className="text-[10px] text-gray-300">{doc.missionName} &middot; {new Date(doc.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              {doc.fileSize && <span className="text-[10px] text-gray-300">{(doc.fileSize / 1024 / 1024).toFixed(1)} Mo</span>}
              <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">D&eacute;pos&eacute;</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-300 text-sm">Aucun document d&eacute;pos&eacute;.</div>
      )}
    </div>
  )
}
