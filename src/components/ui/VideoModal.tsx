import { useEffect } from 'react'
import { X } from 'lucide-react'
import { VideoPlayer } from './VideoPlayer'

/** Modale simple pour lire une vidéo (CTA « Voir la vidéo »). Fermeture : croix, fond, Échap. */
export function VideoModal({ src, title, onClose }: { src: string; title?: string | null; onClose: () => void }): JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-forest-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <p className="text-[14px] font-semibold text-gray-900">{title ?? 'Vidéo'}</p>
          <button onClick={onClose} aria-label="Fermer" className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">
          <VideoPlayer src={src} />
        </div>
      </div>
    </div>
  )
}
