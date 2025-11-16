import { createClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export type UserRole = 'host' | 'cleaner' | 'admin'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  first_name?: string
  last_name?: string
  role: UserRole
  phone?: string
  avatar_url?: string
  language?: string
  address?: string
  is_active: boolean
  company_name?: string
  company_address?: string
  hourly_rate?: number
  preferred_properties?: string[]
  availability?: any
  currency?: string
  created_at: string
  updated_at: string
  last_sign_in?: string
}

export interface AuthUser extends Omit<User, 'user_metadata'> {
  user_metadata?: {
    role?: UserRole
    full_name?: string
  }
  profile?: UserProfile
}

export interface AuthState {
  user: AuthUser | null
  loading: boolean
  role: UserRole | null
  profile: UserProfile | null
}

// Auth helper functions
export class AuthService {
  private supabase = createClient()

  async signUp(email: string, password: string, fullName: string, role: UserRole = 'host') {
    if (!this.supabase) {
      throw new Error('Supabase client not available')
    }

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    })

    if (error) throw error
    return data
  }

  async signIn(email: string, password: string) {
    if (!this.supabase) {
      throw new Error('Supabase client not available')
    }

    console.log('Attempting sign in for:', email)
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('Supabase sign in error:', error)
      throw error
    }
    
    console.log('Sign in successful')
    return data
  }

  async signOut() {
    if (!this.supabase) {
      throw new Error('Supabase client not available')
    }

    // Prefer local scope to avoid 403 when no global refresh token is present
    const { error } = await this.supabase.auth.signOut({ scope: 'local' })
    // Best-effort local cleanup in case session state lingers
    try {
      if (typeof window !== 'undefined') {
        const projectRefMatch = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL)
          ? (process.env.NEXT_PUBLIC_SUPABASE_URL.match(/^https?:\/\/([a-z0-9]{20,})\.supabase\.co/i))
          : null
        const ref = projectRefMatch && projectRefMatch[1]
        if (ref) {
          const key = `sb-${ref}-auth-token`
          window.localStorage.removeItem(key)
        }
      }
    } catch {}
    if (error) throw error
  }

  async resetPassword(email: string) {
    console.log('[Password Reset] Starting password reset for:', email)
    
    if (!this.supabase) {
      console.error('[Password Reset] Supabase client not available')
      throw new Error('Supabase client not available')
    }

    const redirectUrl = `${window.location.origin}/auth/reset-password`
    console.log('[Password Reset] Redirect URL:', redirectUrl)
    console.log('[Password Reset] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

    const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    })

    if (error) {
      console.error('[Password Reset] Error:', error)
      throw error
    }

    console.log('[Password Reset] Success! Email sent. Response:', data)
  }

  async updatePassword(newPassword: string) {
    if (!this.supabase) {
      throw new Error('Supabase client not available')
    }

    const { error } = await this.supabase.auth.updateUser({
      password: newPassword
    })

    if (error) throw error
  }

  async updateProfile(updates: { full_name?: string; role?: UserRole }) {
    if (!this.supabase) {
      throw new Error('Supabase client not available')
    }

    const { error } = await this.supabase.auth.updateUser({
      data: updates
    })

    if (error) throw error
  }

  async getUserProfile(userId?: string): Promise<UserProfile | null> {
    if (!this.supabase) {
      throw new Error('Supabase client not available')
    }

    let targetUserId = userId
    if (!targetUserId) {
      const { data: { user } } = await this.supabase.auth.getUser()
      targetUserId = user?.id
    }

    if (!targetUserId) {
      return null
    }

    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', targetUserId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  }

  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    if (!this.supabase) {
      throw new Error('Supabase client not available')
    }

    const { data: userData } = await this.supabase.auth.getUser()
    if (!userData.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.user.id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      throw error
    }

    return data
  }

  async getCleaners(): Promise<UserProfile[]> {
    if (!this.supabase) {
      throw new Error('Supabase client not available')
    }

    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'cleaner')
      .eq('is_active', true)
      .order('full_name')

    if (error) {
      console.error('Error fetching cleaners:', error)
      return []
    }

    return data || []
  }

  async assignCleanerToProperty(propertyId: string, cleanerId: string, notes?: string): Promise<boolean> {
    if (!this.supabase) {
      throw new Error('Supabase client not available')
    }

    const { error } = await this.supabase.rpc('assign_cleaner_to_property', {
      property_uuid: propertyId,
      cleaner_uuid: cleanerId,
      assignment_notes: notes
    })

    if (error) {
      console.error('Error assigning cleaner to property:', error)
      throw error
    }

    return true
  }

  async removeCleanerFromProperty(propertyId: string, cleanerId: string): Promise<boolean> {
    if (!this.supabase) {
      throw new Error('Supabase client not available')
    }

    const { error } = await this.supabase.rpc('remove_cleaner_from_property', {
      property_uuid: propertyId,
      cleaner_uuid: cleanerId
    })

    if (error) {
      console.error('Error removing cleaner from property:', error)
      throw error
    }

    return true
  }

  async getPropertyCleaners(propertyId: string): Promise<UserProfile[]> {
    if (!this.supabase) {
      throw new Error('Supabase client not available')
    }

    const { data, error } = await this.supabase
      .from('property_assignments')
      .select(`
        cleaner_id,
        user_profiles!property_assignments_cleaner_id_fkey(*)
      `)
      .eq('property_id', propertyId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching property cleaners:', error)
      return []
    }

    return (data?.map(assignment => {
      const profile = Array.isArray(assignment.user_profiles) 
        ? assignment.user_profiles[0] 
        : assignment.user_profiles
      return profile
    }).filter(Boolean) || []) as UserProfile[]
  }

  async getCleanerProperties(cleanerId?: string): Promise<string[]> {
    if (!this.supabase) {
      throw new Error('Supabase client not available')
    }

    const { data: userData } = await this.supabase.auth.getUser()
    const userId = cleanerId || userData.user?.id

    if (!userId) {
      return []
    }

    const { data, error } = await this.supabase
      .from('property_assignments')
      .select('property_id')
      .eq('cleaner_id', userId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching cleaner properties:', error)
      return []
    }

    return data?.map(assignment => assignment.property_id) || []
  }

  getUserRole(user: User | AuthUser | null): UserRole | null {
    if (!user) return null
    return user.user_metadata?.role || 'cleaner'
  }

  async getUserRoleFromProfile(userId?: string): Promise<UserRole | null> {
    const profile = await this.getUserProfile(userId)
    return profile?.role || null
  }

  hasPermission(userRole: UserRole | null, requiredRole: UserRole): boolean {
    if (!userRole) return false
    
    // Admin has access to everything
    if (userRole === 'admin') return true
    
    // Host has access to host and cleaner features
    if (userRole === 'host' && (requiredRole === 'host' || requiredRole === 'cleaner')) return true
    
    // Cleaner can only access cleaner features
    if (userRole === 'cleaner' && requiredRole === 'cleaner') return true
    
    return false
  }

  isHost(userRole: UserRole | null): boolean {
    return userRole === 'host' || userRole === 'admin'
  }

  isCleaner(userRole: UserRole | null): boolean {
    return userRole === 'cleaner' || userRole === 'admin'
  }

  isAdmin(userRole: UserRole | null): boolean {
    return userRole === 'admin'
  }

  canAccessProperties(userRole: UserRole | null): boolean {
    return this.isHost(userRole)
  }

  canAccessBookings(userRole: UserRole | null): boolean {
    // Both hosts and cleaners can view bookings (cleaners need it for cleaning schedules)
    return this.isHost(userRole) || this.isCleaner(userRole)
  }

  canAccessCalendar(userRole: UserRole | null): boolean {
    return this.isHost(userRole)
  }

  canAccessCleanings(userRole: UserRole | null): boolean {
    // Both hosts and cleaners can access cleanings
    return this.isHost(userRole) || this.isCleaner(userRole)
  }

  canManageCleanings(userRole: UserRole | null): boolean {
    // Hosts can manage all cleanings, cleaners can update status/notes
    return this.isHost(userRole) || this.isCleaner(userRole)
  }

  canCreateBookings(userRole: UserRole | null): boolean {
    return this.isHost(userRole)
  }

  canEditBookings(userRole: UserRole | null): boolean {
    return this.isHost(userRole)
  }

  canManageUsers(userRole: UserRole | null): boolean {
    return this.isAdmin(userRole) || this.isHost(userRole)
  }

  canAssignCleaners(userRole: UserRole | null): boolean {
    return this.isHost(userRole)
  }

  canViewReports(userRole: UserRole | null): boolean {
    return this.isHost(userRole)
  }

  canAccessSchedule(userRole: UserRole | null): boolean {
    return this.isHost(userRole) || this.isCleaner(userRole)
  }

  // Role-specific data filtering methods
  async canAccessProperty(propertyId: string, userRole: UserRole | null): Promise<boolean> {
    if (this.isHost(userRole)) return true
    if (this.isCleaner(userRole)) {
      const cleanerProperties = await this.getCleanerProperties()
      return cleanerProperties.includes(propertyId)
    }
    return false
  }

  async canAccessBooking(bookingId: string, userRole: UserRole | null): Promise<boolean> {
    if (this.isHost(userRole)) return true
    if (this.isCleaner(userRole)) {
      // Cleaners can access bookings for properties they're assigned to
      // This would require fetching the booking and checking property access
      return true // Simplified for now - RLS will handle the actual restriction
    }
    return false
  }

  async canAccessCleaning(cleaningId: string, userRole: UserRole | null): Promise<boolean> {
    if (this.isHost(userRole)) return true
    if (this.isCleaner(userRole)) {
      // Cleaners can access cleanings assigned to them or for their properties
      return true // Simplified for now - RLS will handle the actual restriction
    }
    return false
  }
}

export const authService = new AuthService()