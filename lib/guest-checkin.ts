import { createClient } from '@/lib/supabase'

export interface GuestCheckinToken {
  id: string
  booking_id: string
  token: string
  guest_name: string
  guest_email: string
  property_id: string
  created_at: string
  expires_at: string
  accessed_at?: string
  access_count: number
  is_active: boolean
  revoked_at?: string
  revoked_by?: string
  revoke_reason?: string
  ip_addresses: string[]
  user_agents: string[]
  last_ip?: string
  last_user_agent?: string
}

export interface PropertyInformation {
  id: string
  property_id: string
  checkin_instructions?: string
  checkout_instructions?: string
  entry_method?: string
  access_code?: string
  access_instructions?: string
  wifi_network?: string
  wifi_password?: string
  wifi_instructions?: string
  amenities: any[]
  house_rules: string[]
  quiet_hours?: string
  max_guests?: number
  smoking_allowed: boolean
  pets_allowed: boolean
  parties_allowed: boolean
  local_tips?: string
  nearby_restaurants: any[]
  nearby_attractions: any[]
  transportation_info?: string
  emergency_contacts: any[]
  parking_instructions?: string
  trash_pickup_day?: string
  recycling_instructions?: string
  appliance_instructions: any
  special_notes?: string
  created_at: string
  updated_at: string
}

export interface CreateGuestTokenData {
  booking_id: string
  expires_days?: number
}

export interface GuestTokenResult {
  token: string
  checkin_url: string
  expires_at: string
  booking: {
    id: string
    guest_name: string
    guest_email: string
    property_name: string
    check_in: string
    check_out: string
  }
}

export class GuestCheckinService {
  private getSupabaseClient() {
    const client = createClient()
    if (!client) throw new Error('Supabase client not available')
    return client
  }

  /**
   * Generate a guest check-in token for a booking
   */
  async generateGuestToken(data: CreateGuestTokenData): Promise<{ data: GuestTokenResult | null; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()

      // Call the database function to create token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('create_guest_checkin_token', {
          p_booking_id: data.booking_id,
          p_expires_days: data.expires_days || 30
        })

      if (tokenError) {
        console.error('Token generation error:', tokenError)
        return { data: null, error: 'Failed to generate check-in token' }
      }

      const token = tokenData[0]?.token
      const expires_at = tokenData[0]?.expires_at

      if (!token) {
        return { data: null, error: 'Failed to generate token' }
      }

      // Get booking details for response
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          guest_name,
          contact_email,
          check_in,
          check_out,
          properties!inner(
            id,
            name
          )
        `)
        .eq('id', data.booking_id)
        .single()

      if (bookingError || !booking) {
        return { data: null, error: 'Booking not found' }
      }

      // Generate the check-in URL
      const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      
      const checkinUrl = `${baseUrl}/guest-checkin/${token}`

      return {
        data: {
          token,
          checkin_url: checkinUrl,
          expires_at,
          booking: {
            id: booking.id,
            guest_name: booking.guest_name,
            guest_email: booking.contact_email,
            property_name: booking.properties.name,
            check_in: booking.check_in,
            check_out: booking.check_out
          }
        },
        error: null
      }

    } catch (error) {
      console.error('Generate guest token error:', error)
      return { data: null, error: String(error) }
    }
  }

  /**
   * Get existing guest token for a booking
   */
  async getGuestToken(bookingId: string): Promise<{ data: GuestTokenResult | null; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()

      const { data: existingToken, error: tokenError } = await supabase
        .from('guest_checkin_tokens')
        .select(`
          id,
          token,
          expires_at,
          is_active,
          revoked_at,
          access_count,
          accessed_at,
          bookings!inner(
            id,
            guest_name,
            contact_email,
            check_in,
            check_out,
            properties!inner(
              id,
              name
            )
          )
        `)
        .eq('booking_id', bookingId)
        .single()

      if (tokenError || !existingToken) {
        return { data: null, error: 'No check-in token found for this booking' }
      }

      // Generate the check-in URL
      const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      
      const checkinUrl = `${baseUrl}/guest-checkin/${existingToken.token}`

      // Check if token is expired
      const isExpired = new Date(existingToken.expires_at) < new Date()

      return {
        data: {
          token: existingToken.token,
          checkin_url: checkinUrl,
          expires_at: existingToken.expires_at,
          booking: {
            id: existingToken.bookings.id,
            guest_name: existingToken.bookings.guest_name,
            guest_email: existingToken.bookings.contact_email,
            property_name: existingToken.bookings.properties.name,
            check_in: existingToken.bookings.check_in,
            check_out: existingToken.bookings.check_out
          }
        },
        error: isExpired ? 'Token has expired' : (!existingToken.is_active ? 'Token has been revoked' : null)
      }

    } catch (error) {
      console.error('Get guest token error:', error)
      return { data: null, error: String(error) }
    }
  }

  /**
   * Revoke a guest check-in token
   */
  async revokeGuestToken(token: string, reason?: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()

      const { data: revoked, error: revokeError } = await supabase
        .rpc('revoke_guest_token', {
          p_token: token,
          p_reason: reason || 'Manual revocation'
        })

      if (revokeError) {
        console.error('Token revocation error:', revokeError)
        return { success: false, error: 'Failed to revoke token' }
      }

      if (!revoked) {
        return { success: false, error: 'Token not found or already revoked' }
      }

      return { success: true, error: null }

    } catch (error) {
      console.error('Revoke guest token error:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Get or create property information
   */
  async getPropertyInformation(propertyId: string): Promise<{ data: PropertyInformation | null; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()

      const { data, error } = await supabase
        .from('property_information')
        .select('*')
        .eq('property_id', propertyId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Get property information error:', error)
        return { data: null, error: 'Failed to get property information' }
      }

      return { data: data || null, error: null }

    } catch (error) {
      console.error('Get property information error:', error)
      return { data: null, error: String(error) }
    }
  }

  /**
   * Update property information
   */
  async updatePropertyInformation(propertyId: string, updates: Partial<PropertyInformation>): Promise<{ data: PropertyInformation | null; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()

      const { data, error } = await supabase
        .from('property_information')
        .upsert({
          property_id: propertyId,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single()

      if (error) {
        console.error('Update property information error:', error)
        return { data: null, error: 'Failed to update property information' }
      }

      return { data, error: null }

    } catch (error) {
      console.error('Update property information error:', error)
      return { data: null, error: String(error) }
    }
  }

  /**
   * Get guest access logs for a booking
   */
  async getGuestAccessLogs(bookingId: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()

      const { data, error } = await supabase
        .from('guest_access_logs')
        .select('*')
        .eq('booking_id', bookingId)
        .order('accessed_at', { ascending: false })

      if (error) {
        console.error('Get guest access logs error:', error)
        return { data: null, error: 'Failed to get access logs' }
      }

      return { data: data || [], error: null }

    } catch (error) {
      console.error('Get guest access logs error:', error)
      return { data: null, error: String(error) }
    }
  }

  /**
   * Cleanup expired tokens (can be run via cron job)
   */
  async cleanupExpiredTokens(): Promise<{ cleaned: number; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()

      const { data: cleanedCount, error } = await supabase
        .rpc('cleanup_expired_tokens')

      if (error) {
        console.error('Cleanup expired tokens error:', error)
        return { cleaned: 0, error: 'Failed to cleanup expired tokens' }
      }

      return { cleaned: cleanedCount || 0, error: null }

    } catch (error) {
      console.error('Cleanup expired tokens error:', error)
      return { cleaned: 0, error: String(error) }
    }
  }

  /**
   * Generate guest check-in token and get URL for email integration
   */
  async generateTokenForEmail(bookingId: string, expiresInDays: number = 30): Promise<{ checkin_url: string | null; link_expires: string | null; error: string | null }> {
    try {
      // Try to get existing token first
      const existing = await this.getGuestToken(bookingId)
      
      if (existing.data && !existing.error) {
        // Token exists and is valid
        return {
          checkin_url: existing.data.checkin_url,
          link_expires: existing.data.expires_at,
          error: null
        }
      }

      // Generate new token
      const result = await this.generateGuestToken({
        booking_id: bookingId,
        expires_days: expiresInDays
      })

      if (result.error) {
        return { checkin_url: null, link_expires: null, error: result.error }
      }

      return {
        checkin_url: result.data?.checkin_url || null,
        link_expires: result.data?.expires_at || null,
        error: null
      }

    } catch (error) {
      console.error('Generate token for email error:', error)
      return { checkin_url: null, link_expires: null, error: String(error) }
    }
  }
}

// Export singleton instance
export const guestCheckinService = new GuestCheckinService()