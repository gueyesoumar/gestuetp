import { createContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { User } from '../../types/database.types'

export interface AuthState {
  session: Session | null
  profile: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (authId: string, signal?: AbortSignal) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .single()
      .abortSignal(signal ?? new AbortController().signal)

    if (error) {
      console.error('Erreur chargement profil:', error.message)
      setProfile(null)
      return
    }
    setProfile(data)
  }, [])

  useEffect(() => {
    const abortController = new AbortController()

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (abortController.signal.aborted) return
      setSession(currentSession)
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id, abortController.signal)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (abortController.signal.aborted) return
        setSession(newSession)
        if (newSession?.user) {
          fetchProfile(newSession.user.id, abortController.signal)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      abortController.abort()
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Erreur deconnexion:', error.message)
    }
    setProfile(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
