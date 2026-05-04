import { Plus, AlertCircle } from 'lucide-react'
import { FindingCard } from './FindingCard'
import type { UseAssessmentFindingsReturn } from './useAssessmentFindings'

interface FindingsEditorProps {
  findingsHook: UseAssessmentFindingsReturn
  readOnly: boolean
}

export function FindingsEditor({ findingsHook, readOnly }: FindingsEditorProps) {
  const { findings, loading, error, addFinding, updateFinding, deleteFinding, moveFinding } = findingsHook

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[13px] font-semibold text-gray-900">
            Constats <span className="text-red-600">*</span>
            <span className="text-[11px] font-normal text-gray-400 ml-1.5">({findings.length})</span>
          </h4>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Un constat = un &eacute;cart isol&eacute;, une observation ou un point fort.
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => void addFinding()}
            className="text-[11px] font-semibold text-forest-700 bg-white border border-forest-300 px-3 py-1.5 rounded-lg hover:bg-forest-50 inline-flex items-center gap-1.5 shrink-0"
          >
            <Plus size={13} /> Ajouter un constat
          </button>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 inline-flex items-center gap-1.5">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {loading ? (
        <div className="text-[11px] text-gray-400 italic py-4 text-center">Chargement des constats...</div>
      ) : findings.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl py-6 text-center">
          <p className="text-[12px] text-gray-500">Aucun constat pour ce contr&ocirc;le.</p>
          {!readOnly && (
            <p className="text-[10px] text-gray-400 mt-1">
              Ajoutez un constat manuellement ou utilisez la suggestion IA ci-dessus.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {findings.map((f, idx) => (
            <FindingCard
              key={f.id}
              finding={f}
              index={idx}
              total={findings.length}
              readOnly={readOnly}
              onChange={(patch) => updateFinding(f.id, patch)}
              onDelete={() => deleteFinding(f.id)}
              onMoveUp={() => moveFinding(f.id, 'up')}
              onMoveDown={() => moveFinding(f.id, 'down')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
