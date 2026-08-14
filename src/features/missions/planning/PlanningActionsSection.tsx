import { Shuffle, FileSpreadsheet, Mail } from 'lucide-react'
import type { ReactNode } from 'react'

export function PlanningActionsSection() {
  return (
    <div className="p-4">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-3">Actions</h4>
      <div className="flex flex-col gap-2">
        <ActionButton icon={<Shuffle size={15} />} label="R&eacute;partition &eacute;quilibr&eacute;e auto" />
        <ActionButton icon={<FileSpreadsheet size={15} />} label="Exporter le programme (Excel)" />
        <ActionButton icon={<Mail size={15} />} label="Envoyer le planning au client" />
      </div>
    </div>
  )
}

function ActionButton({ icon, label }: { icon: ReactNode; label: string }) {
  // Fonctionnalités non encore implémentées — désactivées honnêtement plutôt que
  // décoratives (elles ne faisaient rien au clic).
  return (
    <button
      type="button"
      disabled
      title="Bientôt disponible"
      className="flex items-center gap-2.5 px-3.5 py-2.5 border border-gray-200 rounded-lg text-xs text-gray-400 bg-gray-50 cursor-not-allowed text-left"
    >
      <span className="w-6 text-center flex justify-center">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Bient&ocirc;t</span>
    </button>
  )
}
