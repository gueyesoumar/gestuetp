import { createContext, useEffect, useState, useCallback, useRef } from 'react'
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
  // Miroir du profil pour onAuthStateChange (evite le closure perime) : sert a ne
  // remettre loading=true que quand un profil doit etre charge (connexion), pas a
  // chaque TOKEN_REFRESHED ou il est deja la (sinon flash de chargement intempestif).
  const profileRef = useRef<User | null>(null)

  const fetchProfile = useCallback(async (authId: string, signal?: AbortSignal) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
        .abortSignal(signal ?? new AbortController().signal)
        .single()

      if (signal?.aborted) return
      if (error) {
        console.error('Erreur chargement profil:', error.message)
        setProfile(null)
        profileRef.current = null
        return
      }
      setProfile(data)
      profileRef.current = data
    } finally {
      // Le profil est résolu (succès ou échec) : c'est seulement ici qu'on lève
      // le flag de chargement, pour qu'aucun guard ne s'exécute avec profile=null
      // alors que la session existe (sinon rendu/redirection cross-rôle erronés).
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const abortController = new AbortController()

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (abortController.signal.aborted) return
      setSession(currentSession)
      if (currentSession?.user) {
        // loading reste true jusqu'à la résolution du profil (gérée par fetchProfile)
        fetchProfile(currentSession.user.id, abortController.signal)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (abortController.signal.aborted) return
        setSession(newSession)
        if (newSession?.user) {
          // Pas encore de profil pour cette session (connexion) : on bloque les
          // guards le temps de le charger, pour qu'aucune redirection role-dependante
          // (ex: owner -> /admin) ne s'execute avec profile=null.
          if (!profileRef.current) setLoading(true)
          fetchProfile(newSession.user.id, abortController.signal)
        } else {
          setProfile(null)
          profileRef.current = null
          setLoading(false)
        }
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
    profileRef.current = null
  }, [])

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
