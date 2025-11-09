import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to initialize Supabase client' },
        { status: 500 }
      )
    }

    // Get all properties with their calendar sources
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        address,
        calendar_sources (
          id,
          platform,
          name,
          ics_url,
          sync_enabled,
          last_sync,
          sync_status
        )
      `)

    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError)
      return NextResponse.json(
        { error: 'Failed to fetch properties' },
        { status: 500 }
      )
    }

    // Filter to only include properties with enabled calendar sources
    const propertiesWithCalendars = properties?.filter(property => 
      property.calendar_sources && 
      property.calendar_sources.some((source: any) => source.sync_enabled)
    ) || []

    return NextResponse.json(propertiesWithCalendars)

  } catch (error) {
    console.error('Properties with calendars API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}