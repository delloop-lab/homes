import { createClient } from '@/lib/supabase'

export type CalendarSource = {
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

export interface CreateCalendarSourceInput {
  property_id: string
  platform: string
  name: string
  ics_url: string
  sync_enabled?: boolean
}

export interface UpdateCalendarSourceInput {
  id: string
  platform?: string
  name?: string
  ics_url?: string
  sync_enabled?: boolean
}

class CalendarSourcesService {
  private getClient() {
    const client = createClient()
    if (!client) throw new Error('Supabase client not available')
    return client
  }

  async getPropertyCalendarSources(propertyId: string): Promise<{ data: CalendarSource[]; error: string | null }> {
    try {
      const supabase = this.getClient()
      const { data, error } = await supabase
        .from('calendar_sources')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
      
      if (error) return { data: [], error: error.message }
      return { data: (data || []) as CalendarSource[], error: null }
    } catch (e) {
      return { data: [], error: String(e) }
    }
  }

  async createCalendarSource(input: CreateCalendarSourceInput): Promise<{ data: CalendarSource | null; error: string | null }> {
    try {
      const supabase = this.getClient()
      const { data, error } = await supabase
        .from('calendar_sources')
        .insert({
          property_id: input.property_id,
          platform: input.platform,
          name: input.name,
          ics_url: input.ics_url,
          sync_enabled: input.sync_enabled ?? true,
        })
        .select('*')
        .single()

      if (error) return { data: null, error: error.message }
      return { data: data as CalendarSource, error: null }
    } catch (e) {
      return { data: null, error: String(e) }
    }
  }

  async updateCalendarSource(input: UpdateCalendarSourceInput): Promise<{ data: CalendarSource | null; error: string | null }> {
    try {
      const supabase = this.getClient()
      const updates: Partial<CalendarSource> = {}
      if (typeof input.platform === 'string') updates.platform = input.platform
      if (typeof input.name === 'string') updates.name = input.name
      if (typeof input.ics_url === 'string') updates.ics_url = input.ics_url
      if (typeof input.sync_enabled === 'boolean') updates.sync_enabled = input.sync_enabled

      const { data, error } = await supabase
        .from('calendar_sources')
        .update(updates)
        .eq('id', input.id)
        .select('*')
        .single()

      if (error) return { data: null, error: error.message }
      return { data: data as CalendarSource, error: null }
    } catch (e) {
      return { data: null, error: String(e) }
    }
  }

  async deleteCalendarSource(id: string): Promise<{ error: string | null }> {
    try {
      const supabase = this.getClient()
      const { error } = await supabase
        .from('calendar_sources')
        .delete()
        .eq('id', id)

      if (error) return { error: error.message }
      return { error: null }
    } catch (e) {
      return { error: String(e) }
    }
  }

  async syncCalendarSource(propertyId: string, sources?: any[], options?: { reconcile?: boolean; platform?: string }): Promise<{ success: boolean; error: string | null; result?: any }> {
    try {
      const response = await fetch('/api/sync-ics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: propertyId,
          sources: sources,
          reconcile: options?.reconcile === true,
          platform: options?.platform
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || 'Sync failed' }
      }

      const result = await response.json()
      return { success: true, error: null, result }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  }
}

export const calendarSourcesService = new CalendarSourcesService()




