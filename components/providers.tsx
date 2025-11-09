'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { AuthUser, UserRole, AuthState, UserProfile, authService } from '@/lib/auth'

const AuthContext = createContext<AuthState & {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  refreshProfile: () => Promise<void>
}>({
  user: null,
  loading: false,
  role: null,
  profile: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  updateProfile: async () => {},
  refreshProfile: async () => {}
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const demoMode = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_DEMO_MODE === 'true')
  
  useEffect(() => {
    const supabase = createClient()
    
    if (!supabase) {
      // Demo mode: attempt to hydrate from localStorage
      try {
        const savedUser = typeof window !== 'undefined' ? localStorage.getItem('demoUser') : null
        const savedProfile = typeof window !== 'undefined' ? localStorage.getItem('demoProfile') : null
        if (savedUser) {
          setUser(JSON.parse(savedUser))
        }
        if (savedProfile) {
          const parsed: UserProfile = JSON.parse(savedProfile)
          setProfile(parsed)
          setRole(parsed.role)
        } else {
          setProfile(null)
          setRole(null)
        }
      } catch {
        setUser(null)
        setProfile(null)
        setRole(null)
      }
      setLoading(false)
      return
    }

    // Get initial session and profile
    const getInitialSession = async () => {
      try {
        // Add timeout to prevent infinite loading, but make it longer and more graceful
        const sessionPromise = supabase.auth.getSession()
        let timeoutFired = false
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => {
          setTimeout(() => {
            timeoutFired = true
            // Only log if it's actually taking too long (20+ seconds)
            resolve({ data: { session: null } })
          }, 20000) // Increased to 20 seconds
        })
        
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])
        const authUser = session?.user as AuthUser || null
        setUser(authUser)
        
        if (authUser) {
          // Fetch or create user profile with timeout
          try {
            const profilePromise = authService.getUserProfile(authUser.id)
            const profileTimeoutPromise = new Promise<null>((resolve) => {
              setTimeout(() => {
                console.warn('Profile fetch timed out after 5s')
                resolve(null)
              }, 5000)
            })
            
            let userProfile = await Promise.race([profilePromise, profileTimeoutPromise])
            
            if (!userProfile) {
              try {
                await supabase.from('user_profiles').upsert({
                  id: authUser.id,
                  email: authUser.email,
                  full_name: (authUser.user_metadata as any)?.full_name || (authUser.email || '').split('@')[0] || 'User',
                  role: (authUser.user_metadata as any)?.role || 'host',
                  is_active: true
                })
                // Ensure auth metadata carries role for immediate permission checks
                if (!((authUser.user_metadata as any)?.role)) {
                  await supabase.auth.updateUser({ data: { role: 'host' } })
                }
                userProfile = await authService.getUserProfile(authUser.id)
              } catch (err) {
                console.warn('Failed to create user profile:', err)
              }
            }
            setProfile(userProfile)
            setRole(userProfile?.role || authService.getUserRole(authUser))
          } catch (err) {
            console.warn('Profile initialization error:', err)
            setProfile(null)
            setRole(authService.getUserRole(authUser))
          }
        } else {
          setProfile(null)
          setRole(null)
        }
      } catch (error) {
        console.warn('Failed to get session:', error)
        setUser(null)
        setProfile(null)
        setRole(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const authUser = session?.user as AuthUser || null
        setUser(authUser)
        
        if (authUser && event === 'SIGNED_IN') {
          // Ensure profile exists with timeout
          try {
            const profilePromise = authService.getUserProfile(authUser.id)
            const profileTimeoutPromise = new Promise<null>((resolve) => {
              setTimeout(() => resolve(null), 5000)
            })
            
            let userProfile = await Promise.race([profilePromise, profileTimeoutPromise])
            
            if (!userProfile) {
              try {
                await supabase.from('user_profiles').upsert({
                  id: authUser.id,
                  email: authUser.email,
                  full_name: (authUser.user_metadata as any)?.full_name || (authUser.email || '').split('@')[0] || 'User',
                  role: (authUser.user_metadata as any)?.role || 'host',
                  is_active: true
                })
                if (!((authUser.user_metadata as any)?.role)) {
                  await supabase.auth.updateUser({ data: { role: 'host' } })
                }
                userProfile = await authService.getUserProfile(authUser.id)
              } catch (err) {
                console.warn('Failed to create profile on sign in:', err)
              }
            }
            setProfile(userProfile)
            setRole(userProfile?.role || authService.getUserRole(authUser))
          } catch (err) {
            console.warn('Profile fetch error on sign in:', err)
            setProfile(null)
            setRole(authService.getUserRole(authUser))
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null)
          setRole(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    const supabase = createClient()
    try {
      if (!supabase) {
        // Demo auth: accept any credentials, set role by email prefix
        const inferredRole: UserRole = email.toLowerCase().includes('admin')
          ? 'admin'
          : email.toLowerCase().includes('cleaner')
            ? 'cleaner'
            : 'host'
        const demoUser = {
          id: 'demo-user-id',
          email,
          user_metadata: { role: inferredRole, full_name: email.split('@')[0] || 'Demo User' }
        } as unknown as AuthUser
        const now = new Date().toISOString()
        const demoProfile: UserProfile = {
          id: 'demo-user-id',
          email,
          full_name: email.split('@')[0] || 'Demo User',
          role: inferredRole,
          is_active: true,
          created_at: now,
          updated_at: now
        }
        setUser(demoUser)
        setProfile(demoProfile)
        setRole(inferredRole)
        if (typeof window !== 'undefined') {
          localStorage.setItem('demoUser', JSON.stringify(demoUser))
          localStorage.setItem('demoProfile', JSON.stringify(demoProfile))
        }
        return
      }
      await authService.signIn(email, password)
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string, role: UserRole = 'host') => {
    setLoading(true)
    const supabase = createClient()
    try {
      if (!supabase) {
        // Demo signup: immediately "create" account and mark as logged in
        const now = new Date().toISOString()
        const demoUser = {
          id: 'demo-user-id',
          email,
          user_metadata: { role, full_name: fullName }
        } as unknown as AuthUser
        const demoProfile: UserProfile = {
          id: 'demo-user-id',
          email,
          full_name: fullName || 'Demo User',
          role,
          is_active: true,
          created_at: now,
          updated_at: now
        }
        setUser(demoUser)
        setProfile(demoProfile)
        setRole(role)
        if (typeof window !== 'undefined') {
          localStorage.setItem('demoUser', JSON.stringify(demoUser))
          localStorage.setItem('demoProfile', JSON.stringify(demoProfile))
        }
        return
      }
      await authService.signUp(email, password, fullName, role)
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      if (!supabase) {
        setUser(null)
        setProfile(null)
        setRole(null)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('demoUser')
          localStorage.removeItem('demoProfile')
        }
        return
      }
      try {
        await authService.signOut()
      } catch (err) {
        // Ignore missing-session errors; proceed with local cleanup
        console.warn('Sign out warning:', (err as any)?.message || err)
      }
      // Ensure local state is cleared even if remote sign-out failed
      setUser(null)
      setProfile(null)
      setRole(null)
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    const supabase = createClient()
    if (!supabase) {
      // Demo: pretend success
      return
    }
    await authService.resetPassword(email)
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const supabase = createClient()
    if (!supabase) {
      // Demo: update local state and persist
      setProfile(prev => {
        const next = { ...(prev as UserProfile), ...updates, updated_at: new Date().toISOString() }
        setRole(next.role)
        if (typeof window !== 'undefined') {
          localStorage.setItem('demoProfile', JSON.stringify(next))
        }
        return next
      })
      return
    }
    const updatedProfile = await authService.updateUserProfile(updates)
    if (updatedProfile) {
      setProfile(updatedProfile)
      setRole(updatedProfile.role)
    }
  }

  const refreshProfile = async () => {
    if (!user) return
    const supabase = createClient()
    if (!supabase) {
      try {
        const savedProfile = typeof window !== 'undefined' ? localStorage.getItem('demoProfile') : null
        if (savedProfile) {
          const parsed: UserProfile = JSON.parse(savedProfile)
          setProfile(parsed)
          setRole(parsed.role)
        }
      } catch {}
      return
    }
    try {
      const userProfile = await authService.getUserProfile(user.id)
      setProfile(userProfile)
      setRole(userProfile?.role || null)
    } catch (error) {
      console.error('Failed to refresh profile:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      role,
      profile,
      signIn, 
      signUp, 
      signOut, 
      resetPassword,
      updateProfile,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a Providers component')
  }
  return context
} 