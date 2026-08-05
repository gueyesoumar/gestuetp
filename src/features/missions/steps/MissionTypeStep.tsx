import type { Framework } from '../../../types/database.types'

interface MissionTypeStepProps {
  frameworks: Framework[]
  selectedFrameworkId: string
  onSelect: (id: string) => void
}

export function MissionTypeStep({ frameworks, selectedFrameworkId, onSelect }: MissionTypeStepProps) {
  const active = frameworks.filter((f) => f.is_active)

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900">Quel référentiel ?</h3>
      <p className="mt-1 text-[13px] text-gray-500">Sélectionnez le référentiel qui structurera l&apos;évaluation</p>

      <div className="mt-5 grid grid-cols-2 gap-3.5">
        {active.map((fw) => (
          <FrameworkCard key={fw.id} framework={fw} selected={fw.id === selectedFrameworkId} onClick={() => onSelect(fw.id)} />
        ))}
        {active.length === 0 && (
          <div className="col-span-2 rounded-xl border-2 border-dashed border-gray-200 p-6 text-center text-[13px] text-gray-400">
            Aucun référentiel disponible. Contactez votre administrateur.
          </div>
        )}
      </div>
    </div>
  )
}

function FrameworkCard({ framework, selected, onClick }: { framework: Framework; selected: boolean; onClick: () => void }) {
  const abbr = framework.name.replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase() || 'REF'

  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left rounded-xl border-2 p-5 transition-all ${
        selected ? 'border-forest-700 bg-forest-50' : 'border-gray-200 hover:border-forest-300'
      }`}
    >
      {selected && (
        <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-forest-700 text-[10px] text-white">✓</span>
      )}
      <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-forest-900 text-gold-500 text-[12px] font-extrabold">
        {abbr}
      </div>
      <div className="mt-2.5 text-[14px] font-bold text-gray-900">
        {framework.name}{framework.version ? ` v${framework.version}` : ''}
      </div>
      {framework.publisher && <div className="mt-0.5 text-[11px] text-gray-400">{framework.publisher}</div>}
      {framework.description && <div className="mt-1.5 text-[12px] text-gray-500 leading-relaxed">{framework.description}</div>}
    </button>
  )
}
