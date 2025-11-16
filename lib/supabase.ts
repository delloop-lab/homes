import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'

// Default placeholder values to prevent crashes
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Client-side Supabase client
export const createClient = () => {
  try {
    return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  } catch (error) {
    console.warn('Supabase client creation failed:', error)
    return null
  }
}

// Server-side Supabase client (for API routes only)
export const createServerSupabaseClient = (cookieStore?: any) => {
  try {
    return createServerClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return cookieStore?.get(name)?.value
          },
        },
      }
    )
  } catch (error) {
    console.warn('Supabase server client creation failed:', error)
    return null
  }
}

// Database types (generated from Supabase schema)
export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          name: string
          address: string
          notes: string | null
          host_id: string
          created_at: string
          updated_at: string
          image_url: string | null
          default_cleaning_cost: number | null
          cleaning_duration_minutes: number | null
        }
        Insert: {
          id?: string
          name: string
          address: string
          notes?: string | null
          host_id: string
          created_at?: string
          updated_at?: string
          image_url?: string | null
          default_cleaning_cost?: number | null
          cleaning_duration_minutes?: number | null
        }
        Update: {
          id?: string
          name?: string
          address?: string
          notes?: string | null
          host_id?: string
          created_at?: string
          updated_at?: string
          image_url?: string | null
          default_cleaning_cost?: number | null
          cleaning_duration_minutes?: number | null
        }
      }
      bookings: {
        Row: {
          id: string
          property_id: string
          guest_name: string
          contact_email: string | null
          contact_phone: string | null
          guest_first_name: string | null
          guest_last_initial: string | null
          check_in: string
          check_out: string
          nights: number
          notes: string | null
          passport_image_url: string | null
          event_uid: string | null
          booking_platform: string
          reservation_url: string | null
          external_hotel_id: string | null
          external_reservation_id: string | null
          guest_phone_last4: string | null
          listing_name: string | null
          total_amount: number | null
          commission_and_charges: number | null
          currency: string | null
          status: 'confirmed' | 'pending' | 'cancelled' | 'checked_in' | 'checked_out'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          guest_name: string
          contact_email?: string | null
          contact_phone?: string | null
          guest_first_name?: string | null
          guest_last_initial?: string | null
          check_in: string
          check_out: string
          notes?: string | null
          passport_image_url?: string | null
          event_uid?: string | null
          booking_platform?: string
          reservation_url?: string | null
          external_hotel_id?: string | null
          external_reservation_id?: string | null
          guest_phone_last4?: string | null
          listing_name?: string | null
          total_amount?: number | null
          commission_and_charges?: number | null
          currency?: string | null
          status?: 'confirmed' | 'pending' | 'cancelled' | 'checked_in' | 'checked_out'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          guest_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          guest_first_name?: string | null
          guest_last_initial?: string | null
          check_in?: string
          check_out?: string
          notes?: string | null
          passport_image_url?: string | null
          event_uid?: string | null
          booking_platform?: string
          reservation_url?: string | null
          external_hotel_id?: string | null
          external_reservation_id?: string | null
          guest_phone_last4?: string | null
          listing_name?: string | null
          total_amount?: number | null
          commission_and_charges?: number | null
          currency?: string | null
          status?: 'confirmed' | 'pending' | 'cancelled' | 'checked_in' | 'checked_out'
          created_at?: string
          updated_at?: string
        }
      }
      cleanings: {
        Row: {
          id: string
          property_id: string
          cleaning_date: string
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes: string | null
          cleaner_name: string | null
          cleaner_contact: string | null
          cost: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          cleaning_date: string
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          cleaner_name?: string | null
          cleaner_contact?: string | null
          cost?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          cleaning_date?: string
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          cleaner_name?: string | null
          cleaner_contact?: string | null
          cost?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      calendar_sources: {
        Row: {
          id: string
          property_id: string
          platform: string
          name: string
          ics_url: string
          sync_enabled: boolean
          last_sync: string | null
          sync_status: 'pending' | 'success' | 'error'
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          platform: string
          name: string
          ics_url: string
          sync_enabled?: boolean
          last_sync?: string | null
          sync_status?: 'pending' | 'success' | 'error'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          platform?: string
          name?: string
          ics_url?: string
          sync_enabled?: boolean
          last_sync?: string | null
          sync_status?: 'pending' | 'success' | 'error'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      bookings_with_properties: {
        Row: {
          id: string
          property_id: string
          guest_name: string
          contact_email: string | null
          contact_phone: string | null
          guest_first_name: string | null
          guest_last_initial: string | null
          check_in: string
          check_out: string
          nights: number
          notes: string | null
          passport_image_url: string | null
          event_uid: string | null
          booking_platform: string
          reservation_url: string | null
          guest_phone_last4: string | null
          listing_name: string | null
          total_amount: number | null
          status: string
          created_at: string
          updated_at: string
          property_name: string
          property_address: string
          host_id: string
        }
      }
      upcoming_cleanings: {
        Row: {
          id: string
          property_id: string
          cleaning_date: string
          status: string
          notes: string | null
          cleaner_name: string | null
          cleaner_contact: string | null
          cost: number | null
          created_at: string
          updated_at: string
          property_name: string
          property_address: string
        }
      }
      current_and_upcoming_bookings: {
        Row: {
          id: string
          property_id: string
          guest_name: string
          contact_email: string | null
          check_in: string
          check_out: string
          nights: number
          notes: string | null
          passport_image_url: string | null
          event_uid: string | null
          booking_platform: string
          total_amount: number | null
          status: string
          created_at: string
          updated_at: string
          property_name: string
          property_address: string
        }
      }
    }
  }
} 