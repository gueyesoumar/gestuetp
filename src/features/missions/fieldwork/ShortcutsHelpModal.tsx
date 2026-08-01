import { useEffect } from 'react'
import { X, Keyboard } from 'lucide-react'

interface ShortcutsHelpModalProps {
  onClose: () => void
}

interface Shortcut {
  keys: string[]
  label: string
}

const SHORTCUTS: { group: string; items: Shortcut[] }[] = [
  {
    group: 'Sauvegarde & soumission',
    items: [
      { keys: ['⌘/Ctrl', 'S'], label: 'Enregistrer manuellement' },
      { keys: ['⌘/Ctrl', '⏎'], label: 'Étape suivante (mode guidé) ou soumettre' },
    ],
  },
  {
    group: 'Navigation',
    items: [
      { keys: ['⌘/Ctrl', 'J'], label: 'Contrôle suivant' },
      { keys: ['⌘/Ctrl', 'K'], label: 'Contrôle précédent' },
      { keys: ['1'], label: 'Étape 1 — Observer' },
      { keys: ['2'], label: 'Étape 2 — Documenter' },
      { keys: ['3'], label: 'Étape 3 — Analyser' },
      { keys: ['4'], label: 'Étape 4 — Validation' },
    ],
  },
  {
    group: 'Aide',
    items: [
      { keys: ['?'], label: 'Afficher cette fenêtre' },
      { keys: ['Échap'], label: 'Fermer un modal' },
    ],
  },
]

export function ShortcutsHelpModal({ onClose }: ShortcutsHelpModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-200 bg-forest-50 flex items-center gap-3">
          <Keyboard size={16} className="text-forest-700" />
          <p className="text-[14px] font-bold text-forest-900 flex-1">Raccourcis clavier</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto space-y-4">
          {SHORTCUTS.map((g) => (
            <div key={g.group}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">{g.group}</p>
              <ul className="space-y-1.5">
                {g.items.map((sc) => (
                  <li key={sc.label} className="flex items-center justify-between text-[12px]">
                    <span className="text-gray-700">{sc.label}</span>
                    <span className="flex items-center gap-1">
                      {sc.keys.map((k, i) => (
                        <span key={i} className="font-mono text-[10px] text-gray-700 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
                          {k}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 bg-[#FAFAFA] text-[10px] text-gray-400 italic">
          Les chiffres 1-4 et ? fonctionnent uniquement hors zone de saisie.
        </div>
      </div>
    </div>
  )
}
