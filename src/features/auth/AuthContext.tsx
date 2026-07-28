import { createContext, useEffect, useState, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import type { Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { User } from '../../types/database.types'

type Aal = 'aal1' | 'aal2'
export interface AalInfo { current: Aal | null; next: Aal | null }

export interface AuthState {
  session: Session | null
  profile: User | null
  loading: boolean
  aal: AalInfo | null
  mfaLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  refreshMfa: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [aal, setAal] = useState<AalInfo | null>(null)
  const [mfaLoading, setMfaLoading] = useState(true)
  const profileRef = useRef<User | null>(null)
  const aalRef = useRef<AalInfo | null>(null)

  const fetchProfile = useCallback(async (authId: string, signal?: AbortSignal) => {
    try {
      const { data, error } = await supabase
        .from('users').select('*').eq('auth_id', authId)
        .abortSignal(signal ?? new AbortController().signal).single()
      if (signal?.aborted) return
      if (error) {
        console.error('Erreur chargement profil:', error.message)
        setProfile(null); profileRef.current = null; return
      }
      setProfile(data); profileRef.current = data
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  // Niveau d'assurance (AAL) : source de vérité de la barrière MFA. Rafraîchi à
  // chaque changement de session et après un enrôlement / challenge vérifié.
  const loadAal = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error || !data) {
      console.error('MFA AAL:', error?.message ?? 'inconnu')
      aalRef.current = null; setAal(null); setMfaLoading(false); return
    }
    const next: AalInfo = { current: data.currentLevel, next: data.nextLevel }
    aalRef.current = next; setAal(next); setMfaLoading(false)
  }, [])

  useEffect(() => {
    const abortController = new AbortController()
    const onSession = (s: Session | null) => {
      if (abortController.signal.aborted) return
      setSession(s)
      if (s?.user) {
        if (!profileRef.current) setLoading(true)
        if (!aalRef.current) setMfaLoading(true)
        fetchProfile(s.user.id, abortController.signal)
        loadAal()
      } else {
        setProfile(null); profileRef.current = null; setLoading(false)
        setAal(null); aalRef.current = null; setMfaLoading(false)
      }
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => onSession(s))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => onSession(s))

    return () => { abortController.abort(); subscription.unsubscribe() }
  }, [fetchProfile, loadAal])

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
    if (error) console.error('Erreur deconnexion:', error.message)
    setProfile(null); profileRef.current = null
    setAal(null); aalRef.current = null
  }, [])

  return (
    <AuthContext.Provider value={{ session, profile, loading, aal, mfaLoading, signIn, signUp, signOut, refreshMfa: loadAal }}>
      {children}
    </AuthContext.Provider>
  )
}
