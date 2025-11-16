import { createClient } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

type Cleaning = Database['public']['Tables']['cleanings']['Row']
type CleaningInsert = Database['public']['Tables']['cleanings']['Insert']
type CleaningUpdate = Database['public']['Tables']['cleanings']['Update']

export interface CleaningWithProperty extends Cleaning {
  property_name?: string
  property_address?: string
  cleaner_full_name?: string
  cleaner_email?: string
  cleaner_id?: string | null
}

export interface CreateCleaningData {
  property_id: string
  cleaning_date: Date
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  notes?: string
  cost?: number
  cleaner_id?: string
}

export interface UpdateCleaningData extends Partial<CreateCleaningData> {
  id: string
}

export class CleaningService {
  private getSupabaseClient() {
    const client = createClient()
    if (!client) throw new Error('Supabase client not available')
    return client
  }

  /**
   * Get all cleanings for the authenticated user (host or cleaner)
   */
  async getCleanings(filters?: {
    property_id?: string
    status?: string
    date_from?: Date
    date_to?: Date
    cleaner_id?: string
    limit?: number
    offset?: number
  }): Promise<{ data: CleaningWithProperty[]; error: string | null; count?: number }> {
    try {
      const supabase = this.getSupabaseClient()
      
      let query = supabase
        .from('cleanings_with_properties')
        .select('*', { count: 'exact' })
        .order('cleaning_date', { ascending: true })

      // Apply filters
      if (filters?.property_id) {
        query = query.eq('property_id', filters.property_id)
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      
      if (filters?.cleaner_id) {
        query = query.eq('cleaner_id', filters.cleaner_id)
      }
      
      if (filters?.date_from) {
        query = query.gte('cleaning_date', filters.date_from.toISOString())
      }
      
      if (filters?.date_to) {
        query = query.lte('cleaning_date', filters.date_to.toISOString())
      }
      
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }
      
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching cleanings:', error)
        return { data: [], error: error.message }
      }

      return { data: data || [], error: null, count: count || 0 }

    } catch (error) {
      console.error('Cleanings fetch error:', error)
      return { data: [], error: String(error) }
    }
  }

  /**
   * Get upcoming cleanings for the next 7 days
   */
  async getUpcomingCleanings(cleaner_id?: string): Promise<{ data: CleaningWithProperty[]; error: string | null }> {
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    return this.getCleanings({
      date_from: today,
      date_to: nextWeek,
      cleaner_id,
      status: undefined, // Include all statuses except cancelled
      limit: 50
    })
  }

  /**
   * Get today's cleanings
   */
  async getTodaysCleanings(cleaner_id?: string): Promise<{ data: CleaningWithProperty[]; error: string | null }> {
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    return this.getCleanings({
      date_from: today,
      date_to: tomorrow,
      cleaner_id,
      limit: 20
    })
  }

  /**
   * Get a specific cleaning by ID
   */
  async getCleaning(id: string): Promise<{ data: CleaningWithProperty | null; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()
      
      const { data, error } = await supabase
        .from('cleanings_with_properties')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching cleaning:', error)
        return { data: null, error: error.message }
      }

      return { data: data as CleaningWithProperty, error: null }

    } catch (error) {
      console.error('Cleaning fetch error:', error)
      return { data: null, error: String(error) }
    }
  }

  /**
   * Create a new cleaning task
   */
  async createCleaning(cleaningData: CreateCleaningData): Promise<{ data: Cleaning | null; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()

      const insertData: CleaningInsert = {
        property_id: cleaningData.property_id,
        cleaning_date: cleaningData.cleaning_date.toISOString(),
        status: cleaningData.status || 'scheduled',
        notes: cleaningData.notes,
        cost: cleaningData.cost,
      }

      const { data, error } = await supabase
        .from('cleanings')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Error creating cleaning:', error)
        return { data: null, error: error.message }
      }

      console.log('Cleaning created successfully:', data.id)
      return { data: data as Cleaning, error: null }

    } catch (error) {
      console.error('Create cleaning error:', error)
      return { data: null, error: String(error) }
    }
  }

  /**
   * Update an existing cleaning task
   */
  async updateCleaning(updateData: UpdateCleaningData): Promise<{ data: Cleaning | null; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()

      const updateFields: CleaningUpdate = {
        id: updateData.id,
        ...(updateData.property_id && { property_id: updateData.property_id }),
        ...(updateData.cleaning_date && { cleaning_date: updateData.cleaning_date.toISOString() }),
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.notes !== undefined && { notes: updateData.notes }),
        ...(updateData.cost !== undefined && { cost: updateData.cost }),
        ...(updateData.cleaner_id !== undefined && { cleaner_id: updateData.cleaner_id })
      }

      console.log('Updating cleaning with fields:', updateFields)

      const { data, error } = await supabase
        .from('cleanings')
        .update(updateFields)
        .eq('id', updateData.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating cleaning:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        return { data: null, error: error.message }
      }

      console.log('Cleaning updated successfully:', data.id)
      return { data: data as Cleaning, error: null }

    } catch (error) {
      console.error('Update cleaning error:', error)
      return { data: null, error: String(error) }
    }
  }

  /**
   * Update cleaning status (commonly used by cleaners)
   */
  async updateStatus(id: string, status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled', notes?: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const updateData: UpdateCleaningData = {
        id,
        status,
        ...(notes !== undefined && { notes })
      }

      const result = await this.updateCleaning(updateData)
      
      return {
        success: result.data !== null,
        error: result.error
      }

    } catch (error) {
      console.error('Update status error:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Delete a cleaning task
   */
  async deleteCleaning(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()

      const { error } = await supabase
        .from('cleanings')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting cleaning:', error)
        return { success: false, error: error.message }
      }

      console.log('Cleaning deleted successfully:', id)
      return { success: true, error: null }

    } catch (error) {
      console.error('Delete cleaning error:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Get cleaning statistics
   */
  async getCleaningStats(filters?: { property_id?: string; cleaner_id?: string }): Promise<{
    total: number
    scheduled: number
    in_progress: number
    completed: number
    cancelled: number
    totalCost: number
    averageCost: number
  }> {
    try {
      const supabase = this.getSupabaseClient()

      let query = supabase
        .from('cleanings_with_properties')
        .select('status, cost')

      if (filters?.property_id) {
        query = query.eq('property_id', filters.property_id)
      }

      if (filters?.cleaner_id) {
        query = query.eq('cleaner_id', filters.cleaner_id)
      }

      const { data, error } = await query

      if (error || !data) {
        return {
          total: 0, scheduled: 0, in_progress: 0, completed: 0, cancelled: 0,
          totalCost: 0, averageCost: 0
        }
      }

      const stats = data.reduce((acc, cleaning) => {
        acc.total++
        acc[cleaning.status as keyof typeof acc] = (acc[cleaning.status as keyof typeof acc] as number) + 1
        acc.totalCost += cleaning.cost || 0
        return acc
      }, {
        total: 0, scheduled: 0, in_progress: 0, completed: 0, cancelled: 0,
        totalCost: 0, averageCost: 0
      })

      stats.averageCost = stats.total > 0 ? stats.totalCost / stats.total : 0

      return stats

    } catch (error) {
      console.error('Cleaning stats error:', error)
      return {
        total: 0, scheduled: 0, in_progress: 0, completed: 0, cancelled: 0,
        totalCost: 0, averageCost: 0
      }
    }
  }

  /**
   * Mark cleaning as started (for cleaner mobile use)
   */
  async startCleaning(id: string): Promise<{ success: boolean; error: string | null }> {
    return this.updateStatus(id, 'in_progress', 'Cleaning started')
  }

  /**
   * Mark cleaning as completed (for cleaner mobile use)
   */
  async completeCleaning(id: string, notes?: string): Promise<{ success: boolean; error: string | null }> {
    return this.updateStatus(id, 'completed', notes || 'Cleaning completed')
  }
}

// Export singleton instance
export const cleaningService = new CleaningService()