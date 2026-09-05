import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { HelpArticle, HelpArticleInsert, HelpArticleUpdate } from '../../../types/database.types'

interface UseHelpArticlesAdmin {
  articles: HelpArticle[]
  loading: boolean
  error: string | null
  create: (input: HelpArticleInsert) => Promise<boolean>
  update: (id: string, patch: HelpArticleUpdate) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
}

/** CRUD des articles d'aide (console super-admin ; écritures gardées par la RLS owner). */
export function useHelpArticlesAdmin(): UseHelpArticlesAdmin {
  const [articles, setArticles] = useState<HelpArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async (): Promise<void> => {
    const { data, error: e } = await supabase.from('help_articles').select('*').order('sort_order', { ascending: true })
    if (e) {
      console.error('help admin list:', e.message)
      setError('Chargement impossible.')
      setLoading(false)
      return
    }
    setArticles(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void refetch() }, [refetch])

  const create = useCallback(async (input: HelpArticleInsert): Promise<boolean> => {
    setError(null)
    // Cast : idiome du repo (types Insert intersectes avec Rec dans database.types).
    const { error: e } = await supabase.from('help_articles').insert(input as HelpArticleInsert & Record<string, unknown>)
    if (e) {
      console.error('help create:', e.message)
      setError(/duplicate|unique/i.test(e.message) ? 'Ce slug est déjà utilisé.' : 'Création impossible.')
      return false
    }
    await refetch()
    return true
  }, [refetch])

  const update = useCallback(async (id: string, patch: HelpArticleUpdate): Promise<boolean> => {
    setError(null)
    // Cast : idiome du repo (types Update intersectes avec Rec dans database.types).
    const { error: e } = await supabase.from('help_articles').update(patch as HelpArticleUpdate & Record<string, unknown>).eq('id', id)
    if (e) {
      console.error('help update:', e.message)
      setError(/duplicate|unique/i.test(e.message) ? 'Ce slug est déjà utilisé.' : 'Mise à jour impossible.')
      return false
    }
    await refetch()
    return true
  }, [refetch])

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    const { error: e } = await supabase.from('help_articles').delete().eq('id', id)
    if (e) {
      console.error('help delete:', e.message)
      setError('Suppression impossible.')
      return false
    }
    await refetch()
    return true
  }, [refetch])

  return { articles, loading, error, create, update, remove }
}
