import { Link } from 'react-router-dom'
import { HelpHint } from './HelpHint'

interface Props {
  /** Seuil d'acceptation réel de l'org. Omis sur les vues multi-org (texte générique). */
  threshold?: number
  /** Masque le lien « Voir la méthode » (ex. sur la page Critères elle-même). */
  hideLink?: boolean
}

/** Pastille d'aide ⓘ expliquant le calcul de l'exposition (formule + bandes + seuil). */
export function ExpositionHelp({ threshold, hideLink = false }: Props): JSX.Element {
  return (
    <HelpHint
      title="Comment l'exposition est calculée"
      footer={!hideLink
        ? <Link to="/risque/criteres" className="text-[12px] font-medium text-forest-700 hover:underline">Voir la méthode complète</Link>
        : undefined}
    >
      <p>
        Exposition = <span className="font-mono text-gray-900">V × I / 16 × 100</span>, où
        <b className="font-mono"> V</b> est la vraisemblance (1 à 4) et <b className="font-mono">I</b> l&rsquo;impact (1 à 4).
        Le résultat est un indice sur 100 (l&rsquo;exposition résiduelle applique en plus l&rsquo;effet des barrières).
      </p>
      <div className="mt-2 space-y-1">
        <div><span className="font-bold text-[#C0392B]">≥ 60</span> <span className="text-gray-600">critique</span></div>
        <div><span className="font-bold text-[#B8860B]">30 à 59</span> <span className="text-gray-600">à surveiller</span></div>
        <div><span className="font-bold text-[#27AE60]">&lt; 30</span> <span className="text-gray-600">maîtrisé</span></div>
      </div>
      <p className="mt-2 text-[11px] text-gray-500">
        {threshold !== undefined
          ? <>Seuil d&rsquo;acceptation : <b>{threshold}</b>. </>
          : <>Seuil d&rsquo;acceptation configurable par organisation (défaut 60). </>}
        Au-dessus, un traitement est requis avant toute acceptation (drapeau « hors seuil »).
      </p>
    </HelpHint>
  )
}
