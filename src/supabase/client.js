import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-client-info': 'skillswap'
    },
    fetch: (...args) => {
      return fetch(...args).catch(err => {
        console.error('Network error:', err)
        throw new Error('Network connection error. Please check your internet connection.')
      })
    }
  }
})

// Add health check function
export async function checkSupabaseConnection() {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1)
    if (error) throw error
    return true
  } catch (err) {
    console.error('Supabase connection error:', err)
    return false
  }
}