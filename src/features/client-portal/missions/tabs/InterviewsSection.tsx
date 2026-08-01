import { Calendar, Check } from 'lucide-react'
import { useClientInterviews } from './useClientInterviews'

/** Section « Entretiens » du portail client (extraite de ClientExchangesTab, CLAUDE.md §2). */
export function InterviewsSection({ missionId }: { missionId: string }): JSX.Element {
  const { interviews, loading } = useClientInterviews(missionId)

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={15} className="text-forest-700" />
        <h3 className="text-sm font-bold">Entretiens</h3>
        {interviews.length > 0 && <span className="text-[10px] font-medium text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full">{interviews.length}</span>}
      </div>
      {loading ? (
        <p className="text-xs text-gray-400 text-center py-4">Chargement...</p>
      ) : interviews.length > 0 ? (
        <div className="space-y-2">
          {interviews.map((iv) => (
            <div key={iv.id} className={`border rounded-lg overflow-hidden ${iv.status === 'scheduled' ? 'border-gold-200 bg-gold-50' : iv.status === 'completed' ? 'border-gray-200 bg-white opacity-60' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <Calendar size={15} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{iv.title}</p>
                  <p className="text-[10px] text-gray-400">{iv.date_label} &middot; {iv.auditor_name}</p>
                </div>
                {iv.status === 'scheduled' && <span className="text-[10px] font-medium text-gold-600 bg-gold-100 px-2 py-0.5 rounded-full">Planifi&eacute;</span>}
                {iv.status === 'confirmed' && <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5"><Check size={10} /> Confirm&eacute;</span>}
                {iv.status === 'completed' && <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Termin&eacute;</span>}
              </div>
              {iv.controlCodes.length > 0 && (
                <div className="px-3 pb-2 flex gap-1 flex-wrap">
                  {iv.controlCodes.map((c) => (
                    <span key={c} className="font-mono text-[8px] font-semibold bg-forest-50 text-forest-700 px-1.5 py-0.5 rounded">{c}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
          <p className="text-xs text-gray-400">Les entretiens planifi&eacute;s appara&icirc;tront ici.</p>
        </div>
      )}
    </section>
  )
}
