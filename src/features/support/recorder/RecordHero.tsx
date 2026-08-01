interface Props {
  onStart: () => void
}

/** Invite a lancer l'enregistrement de reproduction (partage auditeur + client). */
export function RecordHero({ onStart }: Props): JSX.Element {
  return (
    <div className="border border-forest-100 bg-forest-50 rounded-xl p-6 text-center">
      <div className="text-3xl mb-1">&#9210;</div>
      <p className="text-sm font-semibold text-gray-900 mb-1">Reproduire le probl&egrave;me</p>
      <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto mb-4">
        Cliquez, refaites l&apos;action qui ne marche pas&nbsp;: on capture la page, vos clics et l&apos;erreur exacte.
        Aucune frappe ni mot de passe n&apos;est enregistr&eacute;.
      </p>
      <button onClick={onStart} className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">
        &#9210; Lancer l&apos;enregistrement
      </button>
    </div>
  )
}
