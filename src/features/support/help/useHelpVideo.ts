import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

/**
 * Récupère l'URL vidéo (et le titre) d'un article d'aide publié, par slug — pour proposer
 * un CTA « Voir la vidéo » contextuel. Renvoie null tant qu'aucune vidéo n'est configurée.
 */
export function useHelpVideo(slug: string): { videoUrl: string | null; title: string | null } {
  const [state, setState] = useState<{ videoUrl: string | null; title: string | null }>({ videoUrl: null, title: null })

  useEffect(() => {
    const ctrl = new AbortController()
    void (async () => {
      const { data, error } = await supabase
        .from('help_articles')
        .select('title, video_url')
        .eq('slug', slug)
        .eq('is_published', true)
        .abortSignal(ctrl.signal)
        .maybeSingle()
      if (ctrl.signal.aborted) return
      if (error) { console.error('help video:', error.message); return }
      const row = data as { title: string; video_url: string | null } | null
      setState({ videoUrl: row?.video_url ?? null, title: row?.title ?? null })
    })()
    return () => ctrl.abort()
  }, [slug])

  return state
}
