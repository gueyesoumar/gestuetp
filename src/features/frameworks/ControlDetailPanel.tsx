import type { Control } from '../../types/database.types'

interface ControlDetailPanelProps {
  control: Control
  domainName: string
  onClose: () => void
}

export function ControlDetailPanel({ control, domainName, onClose }: ControlDetailPanelProps) {
  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <span className="text-sm font-mono font-semibold text-forest-700">{control.code}</span>
          <h3 className="mt-1 text-base font-semibold text-gray-900">{control.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:text-gray-600"
          aria-label="Fermer"
        >
          &#10005;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        <section>
          <h4 className="text-sm font-semibold text-gray-900">Domaine</h4>
          <p className="mt-1 text-sm text-gray-600">{domainName}</p>
        </section>

        <section>
          <h4 className="text-sm font-semibold text-gray-900">Description</h4>
          <p className="mt-1 text-sm text-gray-600">
            {control.description || 'Aucune description disponible.'}
          </p>
        </section>

        <section>
          <h4 className="text-sm font-semibold text-gray-900">Guide de mise en &oelig;uvre</h4>
          <p className="mt-1 text-sm text-gray-600">
            {control.guidance || 'Aucun guide disponible pour ce contr\u00f4le.'}
          </p>
        </section>

        <section>
          <h4 className="text-sm font-semibold text-gray-900">Preuves attendues</h4>
          <ul className="mt-1 list-disc pl-5 text-sm text-gray-600 space-y-1">
            {getExpectedEvidence(control.code).map((evidence, i) => (
              <li key={i}>{evidence}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function getExpectedEvidence(code: string): string[] {
  const evidenceMap: Record<string, string[]> = {
    'A.5.1': [
      'Politique de s\u00e9curit\u00e9 de l\u2019information approuv\u00e9e et dat\u00e9e',
      'Preuve de diffusion aux collaborateurs',
      'Proc\u00e8s-verbal de revue p\u00e9riodique',
    ],
    'A.5.2': [
      'Organigramme avec r\u00f4les s\u00e9curit\u00e9 identifi\u00e9s',
      'Fiches de poste avec responsabilit\u00e9s s\u00e9curit\u00e9',
    ],
    'A.5.3': [
      'Matrice de s\u00e9paration des t\u00e2ches',
      'Liste des acc\u00e8s par profil',
    ],
    'A.8.5': [
      'Politique d\u2019authentification (MFA, complexit\u00e9 mots de passe)',
      'Configuration technique des m\u00e9canismes d\u2019authentification',
    ],
    'A.8.13': [
      'Politique de sauvegarde',
      'Rapports de tests de restauration',
      'Logs de sauvegarde r\u00e9cents',
    ],
  }

  return evidenceMap[code] ?? [
    'Documents justificatifs de la mise en \u0153uvre du contr\u00f4le',
    'Captures d\u2019\u00e9cran ou extraits de configuration',
    'Proc\u00e8s-verbaux ou comptes-rendus associ\u00e9s',
  ]
}
