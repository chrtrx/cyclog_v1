import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)   // Passwort-Reset im Gange?

  useEffect(() => {
    let settled = false

    // getSession() kann scheitern: abgelaufenes Refresh-Token, beschädigter
    // Eintrag im Speicher, kein Netz. Ohne catch/finally bliebe loading auf
    // true stehen – die App hinge dann für immer im Ladebildschirm, ohne
    // jede Meldung und ohne Weg zurück zur Anmeldung.
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error
        setSession(data?.session ?? null)
      })
      .catch((e) => {
        console.error('Sitzung konnte nicht gelesen werden:', e?.message || e)
        setSession(null)   // zur Anmeldung, statt hängen zu bleiben
      })
      .finally(() => { settled = true; setLoading(false) })

    // Notbremse für den Fall, dass die Antwort gar nicht kommt (Funkloch,
    // pausiertes Projekt): dann weder then noch catch. Lieber die Anmeldung
    // zeigen als einen Ladebalken, der nie endet. Trifft die echte Sitzung
    // später doch ein, setzt der then-Zweig sie nach und der Nutzer ist drin.
    const timer = setTimeout(() => { if (!settled) setLoading(false) }, 8000)

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      // Wenn der Nutzer über einen Reset-Link kommt, sendet Supabase dieses Event.
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(sess)
      setLoading(false)
    })
    return () => { clearTimeout(timer); sub.subscription.unsubscribe() }
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
