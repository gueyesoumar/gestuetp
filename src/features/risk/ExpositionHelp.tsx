import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'

interface Props {
  /** Seuil d'acceptation réel de l'org. Omis sur les vues multi-org (texte générique). */
  threshold?: number
  /** Masque le lien « Voir la méthode » (ex. sur la page Critères elle-même). */
  hideLink?: boolean
}

/** Pastille d'aide ⓘ expliquant le calcul de l'exposition (formule + bandes + seuil). */
export function ExpositionHelp({ threshold, hideLink = false }: Props): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        title="Comment l'exposition est calculée"
        aria-label="Comment l'exposition est calculée"
      >
        <Info size={14} />
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-30 w-72 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-lg">
          <p className="text-[12px] font-bold text-gray-900 mb-1.5">Comment l&rsquo;exposition est calculée</p>
          <p className="text-[12px] text-gray-600">
            Exposition = <span className="font-mono text-gray-900">V × I / 16 × 100</span>, où
            <b className="font-mono"> V</b> est la vraisemblance (1 à 4) et <b className="font-mono">I</b> l&rsquo;impact (1 à 4).
            Le résultat est un indice sur 100.
          </p>
          <div className="mt-2 space-y-1 text-[12px]">
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
          {!hideLink && (
            <Link to="/risque/criteres" onClick={() => setOpen(false)} className="mt-2 inline-block text-[12px] font-medium text-forest-700 hover:underline">
              Voir la méthode complète
            </Link>
          )}
        </div>
      )}
    </span>
  )
}
