import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import type { PvTemplate, PvNotes, PvNotesSection, PvTemplateSection } from '../../../../types/database.types'

// Phase E : pour un controle donne, retourne les notes d'entretien qui le
// couvrent. Le matching se fait sur le code du controle (pv_template.sections[i]
// .control_codes contient ce code).
//
// On ne renvoie que les sections "non vides" : au moins un summary ou une
// reponse a une question-cle. Les entretiens dont le PV est vierge sont ignores
// pour ne pas polluer la vue.

export interface InterviewNoteSnippet {
  interview_id: string
  interview_title: string
  interview_date: string
  topic_id: string
  topic_name: string
  summary: string
  questions: Array<{ question: string; response: string }>
}

interface InterviewSchedule {
  id: string
  title: string
  scheduled_date: string
  pv_template: PvTemplate | null
  pv_notes: PvNotes | null
}

export function useInterviewNotesForControl(
  missionId: string | null | undefined,
  controlCode: string | null | undefined
): { snippets: InterviewNoteSnippet[]; loading: boolean } {
  const [snippets, setSnippets] = useState<InterviewNoteSnippet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!missionId || !controlCode) {
      setSnippets([])
      setLoading(false)
      return
    }
    const ac = new AbortController()
    setLoading(true)

    void (async () => {
      const { data, error } = await supabase
        .from('interview_schedules')
        .select('id, title, scheduled_date, pv_template, pv_notes')
        .eq('mission_id', missionId)
        .abortSignal(ac.signal)

      if (ac.signal.aborted) return
      if (error) {
        console.error('[useInterviewNotesForControl]', error.message)
        setSnippets([])
        setLoading(false)
        return
      }

      const interviews = (data ?? []) as unknown as InterviewSchedule[]
      const collected: InterviewNoteSnippet[] = []

      for (const itv of interviews) {
        const tpl = itv.pv_template
        const notes = itv.pv_notes
        if (!tpl?.sections) continue

        const notesByTopic = new Map<string, PvNotesSection>(
          (notes?.sections ?? []).map((s: PvNotesSection) => [s.topic_id, s])
        )

        for (const tplSec of tpl.sections as PvTemplateSection[]) {
          if (!tplSec.control_codes?.includes(controlCode)) continue
          const noteSec = notesByTopic.get(tplSec.topic_id)
          const summary = (noteSec?.summary ?? '').trim()
          const responses = noteSec?.question_responses ?? {}
          const filledQuestions = (tplSec.questions ?? [])
            .map((q, i) => ({ question: q, response: (responses[String(i)] ?? '').trim() }))
            .filter((q) => q.response.length > 0)
          if (summary.length === 0 && filledQuestions.length === 0) continue

          collected.push({
            interview_id: itv.id,
            interview_title: itv.title,
            interview_date: itv.scheduled_date,
            topic_id: tplSec.topic_id,
            topic_name: tplSec.topic_name,
            summary,
            questions: filledQuestions,
          })
        }
      }

      // Tri : entretien le plus recent d'abord
      collected.sort((a, b) => b.interview_date.localeCompare(a.interview_date))
      setSnippets(collected)
      setLoading(false)
    })()

    return () => ac.abort()
  }, [missionId, controlCode])

  return { snippets, loading }
}
