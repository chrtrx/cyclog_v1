import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)   // Passwort-Reset im Gange?

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      // Wenn der Nutzer über einen Reset-Link kommt, sendet Supabase dieses Event.
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(sess)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    recovery,
    clearRecovery: () => setRecovery(false),
    signUp: (email, password) => supabase.auth.signUp({ email, password }),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,   // zurück zur App (Recovery wird erkannt)
    }),
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
