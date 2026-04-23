import { useState } from 'react'
import { Download, Eye } from 'lucide-react'
import type { EntityScore } from './useSupervisionData'

interface SupervisionReportProps {
  entities: EntityScore[]
  frameworkName: string
  frameworkPublisher: string | null
}

export function SupervisionReport({ entities, frameworkName, frameworkPublisher }: SupervisionReportProps) {
  const [destinataire, setDestinataire] = useState('Pr\u00e9sident de la R\u00e9publique')
  const [emetteur, setEmetteur] = useState(frameworkPublisher ?? 'Direction G\u00e9n\u00e9rale')

  const avgScore = entities.length > 0
    ? Math.round(entities.reduce((s, e) => s + e.globalScore, 0) / entities.length)
    : 0
  const totalNc = entities.reduce((s, e) => s + e.majorNcCount, 0)
  const conformCount = entities.filter((e) => e.globalScore >= 80).length
  const partialCount = entities.filter((e) => e.globalScore >= 60 && e.globalScore < 80).length
  const nonConformCount = entities.filter((e) => e.globalScore < 60).length

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div>
      {/* Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h3 className="text-[13px] font-bold text-gray-900 mb-3">Param&egrave;tres du rapport</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Destinataire
            </label>
            <select
              value={destinataire}
              onChange={(e) => setDestinataire(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-forest-500"
            >
              <option>Pr&eacute;sident de la R&eacute;publique</option>
              <option>Premier Ministre</option>
              <option>Ministre de tutelle</option>
              <option>Directeur G&eacute;n&eacute;ral</option>
              <option>Conseil d&rsquo;Administration</option>
              <option>Comit&eacute; d&rsquo;Audit</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Autorit&eacute; &eacute;mettrice
            </label>
            <input
              type="text"
              value={emetteur}
              onChange={(e) => setEmetteur(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-forest-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Format
            </label>
            <div className="flex gap-2 mt-0.5">
              <button className="flex-1 rounded-lg border-2 border-forest-700 bg-forest-50 px-3 py-2 text-[12px] font-semibold text-forest-700 text-center">PDF</button>
              <button className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-[12px] font-medium text-gray-500 text-center hover:border-gray-300">PPTX</button>
              <button className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-[12px] font-medium text-gray-500 text-center hover:border-gray-300">Excel</button>
            </div>
          </div>
        </div>
      </div>

      {/* Report preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-[800px]">
        {/* Header */}
        <div className="text-center border-b border-gray-200 pb-6 mb-6">
          <div className="text-[12px] font-semibold text-gray-500 mt-1">{emetteur}</div>
          <div className="mt-4 text-[18px] font-extrabold text-forest-700">
            Rapport de synth&egrave;se {'\u2014'} Conformit&eacute; {frameworkName}
          </div>
          <div className="text-[13px] text-gray-500 mt-1">&Agrave; l&rsquo;attention du {destinataire}</div>
        </div>

        {/* Résumé exécutif */}
        <div className="mb-6">
          <h3 className="text-[14px] font-bold text-gray-900 mb-3">I. R&eacute;sum&eacute; ex&eacute;cutif</h3>
          <div className="space-y-2 text-[13px] text-gray-700 leading-relaxed">
            <p>
              <strong>{entities.length} entit&eacute;{entities.length !== 1 ? 's' : ''}</strong> ont &eacute;t&eacute; audit&eacute;{entities.length !== 1 ? 'es' : 'e'} sur le r&eacute;f&eacute;rentiel <strong>{frameworkName}</strong>.
              Le score moyen de conformit&eacute; s&rsquo;&eacute;tablit &agrave; <strong>{avgScore}%</strong>.
            </p>
            {totalNc > 0 && (
              <p>
                <strong>{totalNc} non-conformit&eacute;{totalNc !== 1 ? 's' : ''} majeure{totalNc !== 1 ? 's' : ''}</strong> reste{totalNc !== 1 ? 'nt' : ''} ouverte{totalNc !== 1 ? 's' : ''}.
              </p>
            )}
          </div>
        </div>

        {/* Répartition */}
        <div className="mb-6">
          <h3 className="text-[14px] font-bold text-gray-900 mb-3">II. R&eacute;partition</h3>
          <div className="grid grid-cols-3 gap-3 text-[12px]">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <div className="font-bold text-emerald-700">{conformCount} entit&eacute;{conformCount !== 1 ? 's' : ''} conforme{conformCount !== 1 ? 's' : ''}</div>
              <div className="text-emerald-600 mt-1">Score {'\u2265'} 80%</div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="font-bold text-amber-700">{partialCount} entit&eacute;{partialCount !== 1 ? 's' : ''} partielle{partialCount !== 1 ? 's' : ''}</div>
              <div className="text-amber-600 mt-1">Score 60-79%</div>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <div className="font-bold text-red-700">{nonConformCount} entit&eacute;{nonConformCount !== 1 ? 's' : ''} non conforme{nonConformCount !== 1 ? 's' : ''}</div>
              <div className="text-red-600 mt-1">Score &lt; 60%</div>
            </div>
          </div>
        </div>

        {/* Classement */}
        {entities.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[14px] font-bold text-gray-900 mb-3">III. Classement</h3>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-[10px] font-semibold uppercase text-gray-400 border-b border-gray-200">
                  <th className="text-left py-2">#</th>
                  <th className="text-left py-2">Entit&eacute;</th>
                  <th className="text-left py-2">Score</th>
                  <th className="text-left py-2">NC maj.</th>
                  <th className="text-left py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {entities.map((e, i) => (
                  <tr key={e.clientId} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-400">{i + 1}</td>
                    <td className="py-1.5 font-medium text-gray-900">{e.clientName}</td>
                    <td className={`py-1.5 font-bold ${e.globalScore >= 80 ? 'text-emerald-700' : e.globalScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{e.globalScore}%</td>
                    <td className="py-1.5">{e.majorNcCount}</td>
                    <td className="py-1.5">{e.globalScore >= 80 ? 'Conforme' : e.globalScore >= 60 ? 'Partiel' : 'Non conforme'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recommandations */}
        <div className="mb-6">
          <h3 className="text-[14px] font-bold text-gray-900 mb-3">IV. Recommandations</h3>
          <ol className="list-decimal list-inside space-y-2 text-[13px] text-gray-700">
            <li>&Eacute;tendre le p&eacute;rim&egrave;tre d&rsquo;audit pour l&rsquo;exercice suivant</li>
            <li>Prioriser les domaines syst&eacute;miquement faibles identifi&eacute;s dans la heatmap</li>
            {totalNc > 0 && <li>Exiger un plan de rem&eacute;diation sous 90 jours pour les NC majeures ouvertes</li>}
            {nonConformCount > 0 && <li>Planifier un audit prioritaire des {nonConformCount} entit&eacute;{nonConformCount !== 1 ? 's' : ''} non conforme{nonConformCount !== 1 ? 's' : ''}</li>}
          </ol>
        </div>

        {/* Signature */}
        <div className="border-t border-gray-200 pt-6 mt-8 text-center">
          <div className="text-[12px] text-gray-400">Dakar, le {today}</div>
          <div className="text-[13px] font-semibold text-gray-700 mt-2">{emetteur}</div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-3 mt-6">
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50">
            <Eye size={14} />
            Aper&ccedil;u complet
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-forest-700 px-5 py-2.5 text-[13px] font-medium text-white hover:bg-forest-900">
            <Download size={14} />
            G&eacute;n&eacute;rer le PDF
          </button>
        </div>
      </div>
    </div>
  )
}
