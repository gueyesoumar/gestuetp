/**
 * Lecteur vidéo réutilisable (tutoriels / démos). Rendu via l'élément <video> natif —
 * jamais de dangerouslySetInnerHTML. Ratio 16:9, contrôles natifs, chargement paresseux
 * des métadonnées. `src` est une URL publique (bucket help-media).
 */
interface VideoPlayerProps {
  src: string
  poster?: string | null
  className?: string
}

export function VideoPlayer({ src, poster, className = '' }: VideoPlayerProps): JSX.Element {
  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-gray-200 bg-black ${className}`} style={{ aspectRatio: '16 / 9' }}>
      <video
        controls
        preload="metadata"
        playsInline
        poster={poster ?? undefined}
        src={src}
        className="absolute inset-0 h-full w-full"
      >
        Votre navigateur ne peut pas lire cette vidéo.
      </video>
    </div>
  )
}
