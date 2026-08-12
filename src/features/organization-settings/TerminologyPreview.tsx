import type { ReactNode } from 'react'
import type { VocabGroupId } from '../../lib/vocab-keys'

/** Aperçu en direct : phrases/écrans réels utilisant les termes de la famille active.
 *  `get(key)` renvoie la valeur effective (override saisi, sinon défaut). */
export function TerminologyPreview({ group, get }: { group: VocabGroupId; get: (key: string) => string }): JSX.Element {
  const T = ({ children }: { children: ReactNode }) => <b className="text-forest-700">{children}</b>
  const und = get('entity_gender') === 'm' ? 'un' : 'une'

  const lines: Record<VocabGroupId, JSX.Element[]> = {
    entity: [
      <>Registre des <T>{get('entities_title')}</T></>,
      <>Créer {und} <T>{get('entity_singular')}</T> · liste des <T>{get('entity_plural')}</T></>,
      <>Rapport concernant <T>{get('entity_with_dem')}</T></>,
    ],
    work: [
      <>Nouvelle <T>{get('mission_term')}</T> de conformité</>,
      <><T>{get('finding_term')}</T> classé « majeur » lors de l’évaluation</>,
      <>Émettre une <T>{get('measure_term')}</T></>,
    ],
    actors: [
      <>Le <T>{get('auditor_term')}</T> soumet son évaluation.</>,
      <>Validation : <T>{get('lead_term')}</T>, puis <T>{get('associate_term')}</T>.</>,
      <>Portail : le <T>{get('client_approver_term')}</T> signe au nom de son organisation.</>,
    ],
    portal: [
      <>En-tête du portail : <T>{get('portal_label')}</T></>,
      get('context_banner').trim()
        ? <>Bandeau : <T>{get('context_banner')}</T> — {get('context_banner_sub')}</>
        : <span className="text-gray-400">Aucun bandeau de contexte (champ vide)</span>,
    ],
  }

  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-gold-600 mb-3">Aperçu en direct</div>
      <div className="space-y-2.5">
        {lines[group].map((l, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-[12.5px] text-gray-700">{l}</div>
        ))}
        <p className="text-[11px] text-gray-400 pt-0.5">↑ se met à jour à chaque frappe</p>
      </div>
    </div>
  )
}
