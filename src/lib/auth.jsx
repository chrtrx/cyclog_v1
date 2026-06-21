import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    // Registrieren mit E-Mail + Passwort
    signUp: (email, password) =>
      supabase.auth.signUp({ email, password }),
    // Anmelden mit E-Mail + Passwort
    signIn: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),
    // Passwort vergessen → Reset-Mail
    resetPassword: (email) =>
      supabase.auth.resetPasswordForEmail(email),
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
