import { FileText } from 'lucide-react'
import { SafeMarkdown } from '../../../components/ui/SafeMarkdown'
import type { AssessmentFinding, FindingClassification } from './findings/useAssessmentFindings'
import type { useMissionDocuments } from '../useMissionDocuments'

const FINDING_LABELS: Record<FindingClassification, { label: string; color: string }> = {
  major_nc: { label: 'NC majeure', color: 'bg-red-50 text-red-700 border-red-300' },
  minor_nc: { label: 'NC mineure', color: 'bg-orange-50 text-orange-700 border-orange-300' },
  observation: { label: 'Observation', color: 'bg-blue-50 text-blue-700 border-blue-300' },
  strength: { label: 'Point fort', color: 'bg-green-50 text-green-700 border-green-300' },
}

const CONFORMITY_LABELS: Record<string, { label: string; color: string }> = {
  c: { label: 'Conforme', color: 'bg-green-50 text-green-600' },
  lc: { label: 'Largement conforme', color: 'bg-forest-50 text-forest-700' },
  pc: { label: 'Partiellement conforme', color: 'bg-gold-50 text-gold-600' },
  nc: { label: 'Non conforme', color: 'bg-red-50 text-red-600' },
  na: { label: 'Non applicable', color: 'bg-gray-50 text-gray-500' },
}

type Documents = ReturnType<typeof useMissionDocuments>['documents']

interface ControlReviewViewProps {
  observations: string
  evidenceNotes: string
  conformityLevel: string | null
  documents: Documents
  findings: AssessmentFinding[]
}

export function ControlReviewView({
  observations,
  evidenceNotes,
  conformityLevel,
  documents,
  findings,
}: ControlReviewViewProps) {
  const conformity = conformityLevel ? CONFORMITY_LABELS[conformityLevel] : null
  const hasContent = observations || findings.length > 0 || evidenceNotes || documents.length > 0

  return (
    <div className="px-6 py-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase text-gray-400">Niveau de conformit&eacute;</span>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${conformity?.color ?? 'bg-gray-50 text-gray-300'}`}>
          {conformity?.label ?? 'Non évalué'}
        </span>
      </div>

      {observations && <ReviewSection title="Observations terrain" content={observations} />}
      {evidenceNotes && <ReviewSection title="Notes sur les preuves" content={evidenceNotes} />}

      {documents.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Documents joints ({documents.length})</p>
          <div className="space-y-1">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 px-3 py-2 bg-forest-50 border border-forest-200 rounded-lg">
                <FileText size={15} />
                <span className="text-xs text-gray-700 truncate flex-1">{doc.file_name}</span>
                <span className="text-[10px] text-gray-300">{doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} Ko` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Constats ({findings.length})</p>
        {findings.length === 0 && <p className="text-xs italic text-gray-300">Aucun constat soumis.</p>}
        <div className="space-y-2">
          {findings.map((f) => {
            const cfg = FINDING_LABELS[f.classification]
            return (
              <div key={f.id} className={`border rounded-lg p-3 ${cfg.color}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wide">{cfg.label}</span>
                  {f.priority && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/60 border border-current/20">{f.priority}</span>}
                  {f.proposed_deadline && <span className="text-[9px] text-current/70 ml-auto">&Eacute;ch&eacute;ance : {f.proposed_deadline}</span>}
                </div>
                <SafeMarkdown className="text-[12px] text-gray-900 leading-relaxed">{f.description}</SafeMarkdown>
                {f.risk && (
                  <p className="text-[11px] text-gray-700 mt-1.5"><span className="font-semibold">Risque :</span> <SafeMarkdown inline>{f.risk}</SafeMarkdown></p>
                )}
                {f.recommendation && (
                  <p className="text-[11px] text-gray-700 mt-1"><span className="font-semibold">Reco :</span> <SafeMarkdown inline>{f.recommendation}</SafeMarkdown></p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {!hasContent && (
        <div className="text-center py-8 text-xs text-gray-300">
          Aucune information soumise pour ce contr&ocirc;le.
        </div>
      )}
    </div>
  )
}

function ReviewSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">{title}</p>
      <div className="p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap bg-gray-50 border border-gray-200 text-gray-700">
        {content}
      </div>
    </div>
  )
}
