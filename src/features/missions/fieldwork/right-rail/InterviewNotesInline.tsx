import { useState } from 'react'
import { MessageCircle, ChevronDown, ChevronRight } from 'lucide-react'
import type { InterviewNoteSnippet } from './useInterviewNotesForControl'

interface InterviewNotesInlineProps {
  snippets: InterviewNoteSnippet[]
}

export function InterviewNotesInline({ snippets }: InterviewNotesInlineProps) {
  if (snippets.length === 0) return null

  return (
    <div className="rounded-xl border border-gold-300 bg-gold-50/40 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gold-200 bg-gold-50/80">
        <div className="w-6 h-6 rounded-md bg-gold-500 text-white flex items-center justify-center shrink-0">
          <MessageCircle size={13} />
        </div>
        <h3 className="text-[13px] font-semibold text-gold-900 flex-1">Notes d&rsquo;entretien sur ce contr&ocirc;le</h3>
        <span className="text-[11px] text-gold-700 font-medium">
          {snippets.length} extrait{snippets.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="px-2 py-2 space-y-1.5">
        {snippets.map((s, idx) => (
          <SnippetCard key={`${s.interview_id}-${s.topic_id}`} snippet={s} defaultOpen={idx === 0} />
        ))}
      </div>
    </div>
  )
}

interface SnippetCardProps {
  snippet: InterviewNoteSnippet
  defaultOpen: boolean
}

function SnippetCard({ snippet, defaultOpen }: SnippetCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const dateStr = new Date(snippet.interview_date).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  return (
    <div className="bg-white border border-gold-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gold-50/40"
      >
        {open ? <ChevronDown size={12} className="text-gold-700" /> : <ChevronRight size={12} className="text-gold-700" />}
        <span className="text-[11px] font-mono text-gold-700 shrink-0">{dateStr}</span>
        <span className="text-[12px] font-semibold text-gray-900 truncate flex-1">{snippet.topic_name}</span>
        <span className="text-[10px] text-gray-400 truncate hidden sm:inline">&laquo;{snippet.interview_title}&raquo;</span>
      </button>
      {open && (
        <div className="px-3 py-2 bg-white border-t border-gold-100 space-y-2">
          {snippet.summary && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Synth&egrave;se</p>
              <p className="text-[11px] text-gray-700 whitespace-pre-wrap">{snippet.summary}</p>
            </div>
          )}
          {snippet.questions.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">
                R&eacute;ponses ({snippet.questions.length})
              </p>
              <ul className="space-y-1.5">
                {snippet.questions.map((q, i) => (
                  <li key={i} className="border-l-2 border-gold-300 pl-2.5">
                    <p className="text-[11px] text-gray-500 italic mb-0.5">{q.question}</p>
                    <p className="text-[11px] text-gray-700 whitespace-pre-wrap">{q.response}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
