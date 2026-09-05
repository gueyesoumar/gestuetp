import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import type { HelpArticle, HelpAudience } from '../../../types/database.types'

/**
 * Articles d'aide publiés (base de connaissances). `scope` filtre l'audience :
 * 'staff' pour l'app cabinet, 'client' pour le portail. La RLS ne renvoie de
 * toute façon que le publié aux non-owners.
 */
export function useHelpArticles(scope: 'staff' | 'client' = 'staff'): { articles: HelpArticle[]; loading: boolean } {
  const [articles, setArticles] = useState<HelpArticle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    const audiences: HelpAudience[] = scope === 'client' ? ['all', 'client'] : ['all', 'staff']
    void (async () => {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .eq('is_published', true)
        .in('audience', audiences)
        .order('sort_order', { ascending: true })
        .abortSignal(ctrl.signal)
      if (ctrl.signal.aborted) return
      if (error) {
        console.error('help_articles:', error.message)
        setLoading(false)
        return
      }
      setArticles(data ?? [])
      setLoading(false)
    })()
    return () => ctrl.abort()
  }, [scope])

  return { articles, loading }
}
