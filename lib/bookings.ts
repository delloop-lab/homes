import { createClient } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
// Load email scheduler only on the server to avoid bundling Resend in the browser
async function getEmailScheduler() {
  if (typeof window !== 'undefined') return null
  const mod = await import('@/lib/email-scheduler')
  return mod.emailScheduler
}

type Booking = Database['public']['Tables']['bookings']['Row']
type BookingInsert = Database['public']['Tables']['bookings']['Insert']
type BookingUpdate = Database['public']['Tables']['bookings']['Update']
type Cleaning = Database['public']['Tables']['cleanings']['Insert']

export interface BookingWithProperty extends Booking {
  property_name?: string
  property_address?: string
}

export interface CreateBookingData {
  property_id: string
  guest_name: string
  contact_email?: string
  contact_phone?: string
  check_in: Date
  check_out: Date
  booking_platform?: string
  total_amount?: number
  status?: 'confirmed' | 'pending' | 'cancelled' | 'checked_in' | 'checked_out'
  notes?: string
  passport_image_url?: string
}

export interface UpdateBookingData extends Partial<CreateBookingData> {
  id: string
}

export class BookingService {
  private getSupabaseClient() {
    const client = createClient()
    if (!client) throw new Error('Supabase client not available')
    return client
  }

  /**
   * Get all bookings for the authenticated user's properties
   */
  async getBookings(filters?: {
    property_id?: string
    status?: string
    date_from?: Date
    date_to?: Date
    limit?: number
    offset?: number
  }): Promise<{ data: BookingWithProperty[]; error: string | null; count?: number }> {
    try {
      const supabase = this.getSupabaseClient()
      
      let query = supabase
        .from('bookings_with_properties')
        .select('*', { count: 'exact' })
        .order('check_in', { ascending: true })

      // Apply filters
      if (filters?.property_id) {
        query = query.eq('property_id', filters.property_id)
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      
      // Calendar needs bookings that OVERLAP the range, not only within it
      if (filters?.date_from && filters?.date_to) {
        const fromIso = filters.date_from.toISOString()
        const toIso = filters.date_to.toISOString()
        query = query.or(
          `and(check_in.lte.${toIso},check_out.gte.${fromIso})`
        )
      } else {
        if (filters?.date_from) {
          query = query.gte('check_out', filters.date_from.toISOString())
        }
        if (filters?.date_to) {
          query = query.lte('check_in', filters.date_to.toISOString())
        }
      }
      
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }
      
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching bookings:', error)
        return { data: [], error: error.message }
      }

      return { data: data || [], error: null, count: count || 0 }

    } catch (error) {
      console.error('Bookings fetch error:', error)
      return { data: [], error: String(error) }
    }
  }

  /**
   * Delete bookings by platform, optionally scoped to a property
   */
  async deleteBookingsByPlatform(platform: string, propertyId?: string): Promise<{ success: boolean; error?: string; deleted?: number }> {
    try {
      const supabase = this.getSupabaseClient()

      let query = supabase
        .from('bookings')
        .delete()
        .eq('booking_platform', platform)

      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      const { error, count } = await query.select('id', { count: 'exact' })
      if (error) {
        return { success: false, error: error.message }
      }
      return { success: true, deleted: count || 0 }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  }

  /**
   * Get a specific booking by ID
   */
  async getBooking(id: string): Promise<{ data: BookingWithProperty | null; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()
      
      // Try bookings_with_properties view first, fallback to bookings table if needed
      const queryPromise = supabase
        .from('bookings_with_properties')
        .select('*')
        .eq('id', id)
        .single()

      const timeoutPromise = new Promise<{ data: any; error: { message: string } }>((resolve) => {
        setTimeout(() => resolve({ 
          data: null, 
          error: { message: 'Request timed out' } 
        }), 5000)
      })

      const { data, error } = await Promise.race([queryPromise, timeoutPromise])

      if (error) {
        // If view fails, try direct bookings table
        if (error.message.includes('timed out') || error.message.includes('not found')) {
          const directQuery = await supabase
            .from('bookings')
            .select('*')
            .eq('id', id)
            .single()
          
          if (directQuery.error) {
            console.error('Error fetching booking:', directQuery.error)
            return { data: null, error: directQuery.error.message }
          }
          
          // Convert to BookingWithProperty format
          const booking = directQuery.data as any
          return { 
            data: {
              ...booking,
              property_name: 'Property', // Fallback if property name not available
              property_address: ''
            } as BookingWithProperty, 
            error: null 
          }
        }
        
        console.error('Error fetching booking:', error)
        return { data: null, error: error.message }
      }

      return { data: data as BookingWithProperty, error: null }

    } catch (error) {
      console.error('Booking fetch error:', error)
      return { data: null, error: String(error) }
    }
  }

  /**
   * Create a new booking with automatic night calculation
   */
  async createBooking(bookingData: CreateBookingData): Promise<{ data: Booking | null; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()

      // Validate dates
      if (bookingData.check_in >= bookingData.check_out) {
        return { data: null, error: 'Check-out date must be after check-in date' }
      }

      // Check for overlapping bookings
      const overlapCheck = await this.checkBookingOverlap(
        bookingData.property_id,
        bookingData.check_in,
        bookingData.check_out
      )

      if (overlapCheck.hasOverlap) {
        return { data: null, error: `Booking overlaps with existing reservation: ${overlapCheck.conflictingBooking?.guest_name}` }
      }

      // Prepare booking data for insert
      const insertData: BookingInsert = {
        property_id: bookingData.property_id,
        guest_name: bookingData.guest_name,
        contact_email: bookingData.contact_email,
        contact_phone: bookingData.contact_phone,
        check_in: bookingData.check_in.toISOString(),
        check_out: bookingData.check_out.toISOString(),
        booking_platform: bookingData.booking_platform || 'manual',
        total_amount: bookingData.total_amount,
        status: bookingData.status || 'confirmed',
        notes: bookingData.notes,
        passport_image_url: bookingData.passport_image_url
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Error creating booking:', error)
        return { data: null, error: error.message }
      }

      console.log('Booking created successfully:', data.id)

      // Auto-generate cleaning task after checkout
      if (data.status === 'confirmed') {
        await this.schedulePostCheckoutCleaning(data.id, data.property_id, new Date(data.check_out))
      }

      // Schedule automated emails for the booking (server-only)
      if (bookingData.contact_email && data.status === 'confirmed') {
        try {
          const scheduler = await getEmailScheduler()
          if (scheduler) {
            const bookingWithProperty = {
              ...data,
              property_name: 'Property',
              property_address: '',
              contact_email: bookingData.contact_email
            } as BookingWithProperty
            await scheduler.scheduleBookingEmails(bookingWithProperty)
            console.log('Emails scheduled for booking:', data.id)
          }
        } catch (emailError) {
          console.error('Failed to schedule emails for booking:', data.id, emailError)
          // Don't fail the booking creation if email scheduling fails
        }
      }

      return { data: data as Booking, error: null }

    } catch (error) {
      console.error('Create booking error:', error)
      return { data: null, error: String(error) }
    }
  }

  /**
   * Update an existing booking
   */
  async updateBooking(updateData: UpdateBookingData): Promise<{ data: Booking | null; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()

      // Check if we're only updating simple fields (name, email, phone, notes, amount, passport, status)
      // Status changes don't need overlap checking, only date changes do
      // If no dates are being updated, treat it as a simple update
      const isSimpleUpdate = !updateData.check_in && !updateData.check_out
      
      console.log('Update booking - isSimpleUpdate:', isSimpleUpdate, 'Fields:', Object.keys(updateData))
      
      let currentBooking: BookingWithProperty | null = null
      let currentStatus: string = 'confirmed'
      let currentPropertyId: string | null = null
      
      // For simple updates, skip fetching if we don't need it for the response
      // Only fetch if we need property_id for constructing the response
      if (isSimpleUpdate) {
        console.log('Simple update - skipping data fetch for faster update')
        // Don't fetch - we'll construct response from updateData
      } else {
        // Only fetch if we're updating dates, status, or platform
        // Use a shorter timeout and fallback to direct query
        try {
          const directQuery = await Promise.race([
            supabase
              .from('bookings')
              .select('property_id, status, check_in, check_out')
              .eq('id', updateData.id)
              .single(),
            new Promise<{ data: any; error: { message: string } }>((resolve) => {
              setTimeout(() => resolve({ 
                data: null, 
                error: { message: 'Request timed out' } 
              }), 3000)
            })
          ])
          
          if (directQuery.error || !directQuery.data) {
            // If we can't get booking data but it's a simple update, proceed anyway
            if (isSimpleUpdate) {
              currentStatus = 'confirmed'
            } else {
              return { data: null, error: 'Booking not found or request timed out' }
            }
          } else {
            currentPropertyId = directQuery.data.property_id
            currentStatus = directQuery.data.status || 'confirmed'
            // Create minimal booking object for validation
            currentBooking = {
              property_id: currentPropertyId,
              status: currentStatus,
              check_in: directQuery.data.check_in,
              check_out: directQuery.data.check_out
            } as any
          }
        } catch (err) {
          if (!isSimpleUpdate) {
            return { data: null, error: 'Failed to fetch booking data' }
          }
        }
      }

      // Validate dates if they're being updated
      if (updateData.check_in || updateData.check_out) {
        if (!currentPropertyId) {
          return { data: null, error: 'Cannot update dates without property information' }
        }
        
        const checkIn = updateData.check_in
        const checkOut = updateData.check_out

        if (!checkIn || !checkOut) {
          return { data: null, error: 'Both check-in and check-out dates are required' }
        }

        if (checkIn >= checkOut) {
          return { data: null, error: 'Check-out date must be after check-in date' }
        }

        // Check for overlapping bookings (excluding current booking) with timeout
        const overlapCheckPromise = this.checkBookingOverlap(
          currentPropertyId,
          checkIn,
          checkOut,
          updateData.id
        )
        const overlapTimeoutPromise = new Promise<{ hasOverlap: boolean; conflictingBooking?: Booking }>((resolve) => {
          setTimeout(() => resolve({ hasOverlap: false }), 3000)
        })
        
        const overlapCheck = await Promise.race([overlapCheckPromise, overlapTimeoutPromise])

        if (overlapCheck.hasOverlap) {
          return { data: null, error: `Updated dates overlap with existing reservation: ${overlapCheck.conflictingBooking?.guest_name}` }
        }
      }

      // Prepare update data (do not attempt to update primary key 'id')
      const updateFields: BookingUpdate = {
        ...(Object.prototype.hasOwnProperty.call(updateData, 'guest_name') && { guest_name: updateData.guest_name as string }),
        ...(updateData.contact_email !== undefined && { contact_email: updateData.contact_email }),
        ...(updateData.contact_phone !== undefined && { contact_phone: updateData.contact_phone }),
        ...(updateData.check_in && { check_in: updateData.check_in.toISOString() }),
        ...(updateData.check_out && { check_out: updateData.check_out.toISOString() }),
        ...(updateData.booking_platform !== undefined && { booking_platform: updateData.booking_platform }),
        ...(updateData.total_amount !== undefined && { total_amount: updateData.total_amount }),
        ...(updateData.status !== undefined && { status: updateData.status }),
        ...(updateData.notes !== undefined && { notes: updateData.notes }),
        ...(updateData.passport_image_url !== undefined && { passport_image_url: updateData.passport_image_url })
      }

      // Update with timeout - use longer timeout (database triggers may be slow)
      // Simple updates still trigger overlap checks, so they can be slow
      const timeoutMs = isSimpleUpdate ? 30000 : 20000
      
      let data: any = null
      let error: any = null
      
      if (isSimpleUpdate) {
        // For simple updates, use a reasonable timeout but actually wait for completion
        // The database trigger is now optimized to skip overlap checks when dates don't change
        console.log('Executing simple update with timeout')
        
        const updatePromise = supabase
          .from('bookings')
          .update(updateFields)
          .eq('id', updateData.id)
        
        const timeoutPromise = new Promise<{ error: { message: string } }>((resolve) => {
          setTimeout(() => {
            resolve({ error: { message: `Update request timed out after ${timeoutMs}ms` } })
          }, timeoutMs)
        })
        
        try {
          const result = await Promise.race([updatePromise, timeoutPromise])
          
          if ('error' in result && result.error) {
            error = result.error
            console.error('Update error:', result.error)
          } else {
            // Update succeeded, construct response from updateData
            // For simple updates, we don't have currentBooking, so just return what we updated
            data = {
              id: updateData.id,
              ...updateFields,
              updated_at: new Date().toISOString()
            }
            console.log('Simple update succeeded')
          }
        } catch (err: any) {
          console.error('Update exception:', err)
          error = { message: err.message || 'Update failed' }
        }
      } else {
        // For complex updates, select the full record
        const updatePromise = supabase
          .from('bookings')
          .update(updateFields)
          .eq('id', updateData.id)
          .select('*')
          .single()
        
        const updateTimeoutPromise = new Promise<{ data: any; error: { message: string } }>((resolve) => {
          setTimeout(() => resolve({ 
            data: null, 
            error: { message: `Update request timed out after ${timeoutMs}ms` } 
          }), timeoutMs)
        })
        
        console.log('Executing complex update (with select) with timeout:', timeoutMs, 'ms')
        const result = await Promise.race([updatePromise, updateTimeoutPromise])
        data = result.data
        error = result.error
        console.log('Complex update result:', error ? 'ERROR: ' + error.message : 'SUCCESS', data ? 'data.id: ' + data.id : 'no data')
      }

      if (error) {
        console.error('Error updating booking:', error)
        return { data: null, error: error.message }
      }

      if (!data) {
        return { data: null, error: 'Update timed out or returned no data' }
      }

      console.log('Booking updated successfully:', data.id)

      // Handle status-specific actions (non-blocking)
      if (updateData.status && currentBooking) {
        this.handleBookingStatusChange(data as Booking, currentStatus, updateData.status)
          .catch(err => console.error('Status change handler error:', err))
      }

      return { data: data as Booking, error: null }

    } catch (error) {
      console.error('Update booking error:', error)
      return { data: null, error: String(error) }
    }
  }

  /**
   * Delete a booking and associated cleaning tasks
   */
  async deleteBooking(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()

      // Get booking data first
      const { data: booking } = await this.getBooking(id)
      if (!booking) {
        return { success: false, error: 'Booking not found' }
      }

      // Delete associated cleaning tasks first
      await supabase
        .from('cleanings')
        .delete()
        .eq('property_id', booking.property_id)
        .gte('cleaning_date', booking.check_out)
        .lte('cleaning_date', new Date(new Date(booking.check_out).getTime() + 24 * 60 * 60 * 1000).toISOString()) // Within 24 hours of checkout

      // Delete the booking
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting booking:', error)
        return { success: false, error: error.message }
      }

      console.log('Booking deleted successfully:', id)
      return { success: true, error: null }

    } catch (error) {
      console.error('Delete booking error:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Check for booking overlaps
   */
  private async checkBookingOverlap(
    propertyId: string,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: string
  ): Promise<{ hasOverlap: boolean; conflictingBooking?: Booking }> {
    try {
      const supabase = this.getSupabaseClient()

      let query = supabase
        .from('bookings')
        .select('*')
        .eq('property_id', propertyId)
        .neq('status', 'cancelled')
        .or(`and(check_in.lte.${checkIn.toISOString()},check_out.gt.${checkIn.toISOString()}),and(check_in.lt.${checkOut.toISOString()},check_out.gte.${checkOut.toISOString()}),and(check_in.gte.${checkIn.toISOString()},check_out.lte.${checkOut.toISOString()})`)

      if (excludeBookingId) {
        query = query.neq('id', excludeBookingId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error checking booking overlap:', error)
        return { hasOverlap: false }
      }

      const hasOverlap = data && data.length > 0
      return {
        hasOverlap,
        conflictingBooking: hasOverlap ? data[0] as Booking : undefined
      }

    } catch (error) {
      console.error('Overlap check error:', error)
      return { hasOverlap: false }
    }
  }

  /**
   * Schedule cleaning task after checkout
   */
  private async schedulePostCheckoutCleaning(
    bookingId: string,
    propertyId: string,
    checkoutDate: Date
  ): Promise<void> {
    try {
      const supabase = this.getSupabaseClient()

      // Schedule cleaning 2-4 hours after checkout (default 3 hours)
      const cleaningDate = new Date(checkoutDate.getTime() + 3 * 60 * 60 * 1000)

      // Check if cleaning already exists for this time slot
      const { data: existingCleaning } = await supabase
        .from('cleanings')
        .select('id')
        .eq('property_id', propertyId)
        .gte('cleaning_date', new Date(cleaningDate.getTime() - 2 * 60 * 60 * 1000).toISOString()) // 2 hours before
        .lte('cleaning_date', new Date(cleaningDate.getTime() + 2 * 60 * 60 * 1000).toISOString()) // 2 hours after
        .maybeSingle()

      if (existingCleaning) {
        console.log('Cleaning already scheduled for this time slot')
        return
      }

      // Fetch property default cleaning cost
      const { data: prop } = await supabase
        .from('properties')
        .select('default_cleaning_cost')
        .eq('id', propertyId)
        .single()

      const defaultCost = (prop as any)?.default_cleaning_cost ?? 80

      const cleaningData: Cleaning = {
        property_id: propertyId,
        cleaning_date: cleaningDate.toISOString(),
        status: 'scheduled',
        notes: `Post-checkout cleaning for booking ${bookingId}`,
        cost: defaultCost
      }

      const { data, error } = await supabase
        .from('cleanings')
        .insert(cleaningData)
        .select()
        .single()

      if (error) {
        console.error('Error scheduling cleaning:', error)
        return
      }

      console.log('Post-checkout cleaning scheduled:', data.id)

    } catch (error) {
      console.error('Schedule cleaning error:', error)
    }
  }

  /**
   * Handle booking status changes
   */
  private async handleBookingStatusChange(
    booking: Booking,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    try {
      // If booking is being confirmed, schedule cleaning
      if (oldStatus !== 'confirmed' && newStatus === 'confirmed') {
        await this.schedulePostCheckoutCleaning(
          booking.id,
          booking.property_id,
          new Date(booking.check_out)
        )
      }

      // If booking is being cancelled, cancel associated cleanings and emails
      if (newStatus === 'cancelled') {
        await this.cancelAssociatedCleanings(booking.id, booking.property_id, new Date(booking.check_out))
        
        // Cancel scheduled emails (server-only)
        try {
          const scheduler = await getEmailScheduler()
          if (scheduler) {
            await scheduler.cancelBookingEmails(booking.id)
            console.log('Cancelled scheduled emails for booking:', booking.id)
          }
        } catch (emailError) {
          console.error('Failed to cancel emails for booking:', booking.id, emailError)
        }
      }

      // Log status change
      console.log(`Booking ${booking.id} status changed from ${oldStatus} to ${newStatus}`)

    } catch (error) {
      console.error('Handle status change error:', error)
    }
  }

  /**
   * Cancel cleanings associated with a booking
   */
  private async cancelAssociatedCleanings(
    bookingId: string,
    propertyId: string,
    checkoutDate: Date
  ): Promise<void> {
    try {
      const supabase = this.getSupabaseClient()

      // Find cleanings within 24 hours of checkout
      const { data: cleanings } = await supabase
        .from('cleanings')
        .select('id')
        .eq('property_id', propertyId)
        .gte('cleaning_date', checkoutDate.toISOString())
        .lte('cleaning_date', new Date(checkoutDate.getTime() + 24 * 60 * 60 * 1000).toISOString())
        .eq('status', 'scheduled')

      if (cleanings && cleanings.length > 0) {
        const { error } = await supabase
          .from('cleanings')
          .update({ 
            status: 'cancelled',
            notes: `Cancelled due to booking ${bookingId} cancellation`
          })
          .in('id', cleanings.map(c => c.id))

        if (error) {
          console.error('Error cancelling cleanings:', error)
        } else {
          console.log(`Cancelled ${cleanings.length} associated cleanings`)
        }
      }

    } catch (error) {
      console.error('Cancel cleanings error:', error)
    }
  }

  /**
   * Get booking statistics
   */
  async getBookingStats(propertyId?: string): Promise<{
    total: number
    confirmed: number
    pending: number
    cancelled: number
    checkedIn: number
    checkedOut: number
    totalRevenue: number
    averageNights: number
  }> {
    try {
      const supabase = this.getSupabaseClient()

      let query = supabase
        .from('bookings_with_properties')
        .select('status, total_amount, nights')

      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      const { data, error } = await query

      if (error || !data) {
        return {
          total: 0, confirmed: 0, pending: 0, cancelled: 0,
          checkedIn: 0, checkedOut: 0, totalRevenue: 0, averageNights: 0
        }
      }

      const stats = data.reduce((acc, booking) => {
        acc.total++
        acc[booking.status as keyof typeof acc] = (acc[booking.status as keyof typeof acc] as number) + 1
        acc.totalRevenue += booking.total_amount || 0
        acc.averageNights += booking.nights || 0
        return acc
      }, {
        total: 0, confirmed: 0, pending: 0, cancelled: 0,
        checkedIn: 0, checkedOut: 0, totalRevenue: 0, averageNights: 0
      })

      stats.averageNights = stats.total > 0 ? stats.averageNights / stats.total : 0

      return stats

    } catch (error) {
      console.error('Booking stats error:', error)
      return {
        total: 0, confirmed: 0, pending: 0, cancelled: 0,
        checkedIn: 0, checkedOut: 0, totalRevenue: 0, averageNights: 0
      }
    }
  }
}

// Export singleton instance
export const bookingService = new BookingService()