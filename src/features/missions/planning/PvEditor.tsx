import { useState } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import type { PvTemplate, PvNotes, PvNotesSection } from '../../../types/database.types'

interface PvEditorProps {
  template: PvTemplate | null
  notes: PvNotes | null
  onChange: (notes: PvNotes) => void
}

// Editeur structure du PV : une section par sujet, avec resume libre +
// reponses aux questions pre-remplies.
export function PvEditor({ template, notes, onChange }: PvEditorProps) {
  if (!template || template.sections.length === 0) {
    return (
      <div className="text-[11px] text-gray-400 italic px-3 py-4 border border-dashed border-gray-200 rounded-lg text-center">
        Aucun canevas de PV (cet entretien n&rsquo;a pas de sujets associ&eacute;s).
      </div>
    )
  }

  // notesByTopic : map topic_id → section pour acces rapide
  const notesByTopic = new Map<string, PvNotesSection>(
    (notes?.sections ?? []).map((s) => [s.topic_id, s])
  )

  const updateSection = (topicId: string, patch: Partial<PvNotesSection>): void => {
    const current = notesByTopic.get(topicId) ?? {
      topic_id: topicId, summary: '', question_responses: {},
    }
    const next: PvNotesSection = {
      topic_id: topicId,
      summary: patch.summary !== undefined ? patch.summary : current.summary,
      question_responses: patch.question_responses ?? current.question_responses,
    }
    const otherSections = (notes?.sections ?? []).filter((s) => s.topic_id !== topicId)
    onChange({ sections: [...otherSections, next] })
  }

  return (
    <div className="space-y-2">
      {template.sections.map((section, idx) => (
        <PvSection
          key={section.topic_id}
          section={section}
          notes={notesByTopic.get(section.topic_id) ?? null}
          defaultOpen={idx === 0}
          onSummaryChange={(s) => updateSection(section.topic_id, { summary: s })}
          onAnswerChange={(qIdx, val) => {
            const cur = notesByTopic.get(section.topic_id)?.question_responses ?? {}
            updateSection(section.topic_id, {
              question_responses: { ...cur, [String(qIdx)]: val },
            })
          }}
        />
      ))}
    </div>
  )
}

interface PvSectionProps {
  section: PvTemplate['sections'][number]
  notes: PvNotesSection | null
  defaultOpen: boolean
  onSummaryChange: (summary: string) => void
  onAnswerChange: (questionIndex: number, value: string) => void
}

function PvSection({ section, notes, defaultOpen, onSummaryChange, onAnswerChange }: PvSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const responses = notes?.question_responses ?? {}
  const answeredCount = section.questions.filter((_, i) => (responses[String(i)] ?? '').trim().length > 0).length
  const totalQ = section.questions.length

  return (
    <div className="border border-gold-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gold-50 hover:bg-gold-100 text-left"
      >
        {open ? <ChevronDown size={13} className="text-gold-700" /> : <ChevronRight size={13} className="text-gold-700" />}
        <span className="text-[12px] font-bold text-gold-700 flex-1">{section.topic_name}</span>
        <span className="text-[10px] font-mono text-gold-700">{section.control_codes.length} ctrl</span>
        {totalQ > 0 && (
          <span className="text-[10px] font-semibold text-gold-700 bg-white border border-gold-200 px-1.5 py-0.5 rounded">
            {answeredCount}/{totalQ}
          </span>
        )}
        {(notes?.summary ?? '').trim().length > 0 && (
          <FileText size={11} className="text-forest-700" />
        )}
      </button>
      {open && (
        <div className="px-3 py-3 bg-white space-y-3">
          {section.control_codes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {section.control_codes.map((code) => (
                <span key={code} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-forest-50 text-forest-700 border border-forest-200">
                  {code}
                </span>
              ))}
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500 block mb-1">
              Synth&egrave;se du sujet
            </label>
            <textarea
              value={notes?.summary ?? ''}
              onChange={(e) => onSummaryChange(e.target.value)}
              placeholder="Compte-rendu global du sujet&hellip;"
              rows={2}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-[12px] outline-none focus:border-forest-500 resize-y"
            />
          </div>

          {section.questions.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">
                Questions-cl&eacute; ({answeredCount}/{totalQ} renseign&eacute;es)
              </p>
              <div className="space-y-2">
                {section.questions.map((q, i) => (
                  <div key={i} className="border-l-2 border-gold-300 pl-2.5">
                    <p className="text-[11px] text-gray-700 mb-1">{q}</p>
                    <textarea
                      value={responses[String(i)] ?? ''}
                      onChange={(e) => onAnswerChange(i, e.target.value)}
                      placeholder="R&eacute;ponse&hellip;"
                      rows={2}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-[11px] outline-none focus:border-forest-500 resize-y"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
