import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, checkSupabaseConnection } from '../supabase/client'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    async function initializeAuth() {
      try {
        // Check Supabase connection first
        const connected = await checkSupabaseConnection()
        setIsConnected(connected)
        
        if (!connected) {
          throw new Error('Unable to connect to the database. Please check your internet connection.')
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          throw sessionError
        }
        
        setUser(session?.user ?? null)
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
      } catch (err) {
        console.error('Auth initialization error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const value = {
    signUp: async (data) => {
      const { error } = await supabase.auth.signUp(data)
      if (error) throw error
    },
    signIn: async (data) => {
      const { error } = await supabase.auth.signInWithPassword(data)
      if (error) throw error
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    user,
    error,
    isConnected
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}