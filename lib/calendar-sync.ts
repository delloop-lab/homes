// Client-side calendar sync functions

export interface CalendarSyncResult {
  success: boolean
  totalProcessed: number
  totalErrors: number
  sources: SourceResult[]
  processingTime: number
  error?: string
}

export interface SourceResult {
  name: string
  platform: string
  url: string
  bookingsProcessed: number
  errors: string[]
  success: boolean
}

export interface CalendarSyncRequest {
  property_id: string
  sources?: {
    name: string
    platform: string
    url: string
  }[]
}

/**
 * Sync calendar data for a specific property
 */
export async function syncPropertyCalendars(propertyId: string, sources?: any[]): Promise<CalendarSyncResult> {
  try {
    const response = await fetch('/api/sync-ics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        property_id: propertyId,
        sources
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`)
    }

    return result

  } catch (error) {
    console.error('Calendar sync error:', error)
    return {
      success: false,
      totalProcessed: 0,
      totalErrors: 1,
      sources: [],
      processingTime: 0,
      error: String(error)
    }
  }
}

/**
 * Sync all calendars for all properties (admin function)
 */
export async function syncAllCalendars(): Promise<CalendarSyncResult[]> {
  try {
    // First, get all properties with calendar sources
    const response = await fetch('/api/properties-with-calendars')
    if (!response.ok) {
      throw new Error('Failed to fetch properties')
    }

    const properties = await response.json()
    const results: CalendarSyncResult[] = []

    // Sync each property
    for (const property of properties) {
      console.log(`Syncing calendars for property: ${property.name}`)
      const result = await syncPropertyCalendars(property.id, property.calendar_sources)
      results.push(result)
    }

    return results

  } catch (error) {
    console.error('Sync all calendars error:', error)
    return [{
      success: false,
      totalProcessed: 0,
      totalErrors: 1,
      sources: [],
      processingTime: 0,
      error: String(error)
    }]
  }
}

/**
 * Check API health status
 */
export async function checkSyncApiHealth(): Promise<{
  status: string
  timestamp: string
  environment: {
    hasAirbnbUrl: boolean
    hasVrboUrl: boolean
    hasBookingUrl: boolean
    hasSupabaseUrl: boolean
  }
}> {
  try {
    const response = await fetch('/api/sync-ics?health=true')
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`)
    }

    return result

  } catch (error) {
    console.error('Health check error:', error)
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      environment: {
        hasAirbnbUrl: false,
        hasVrboUrl: false,
        hasBookingUrl: false,
        hasSupabaseUrl: false
      }
    }
  }
}

/**
 * Format sync results for display
 */
export function formatSyncResults(result: CalendarSyncResult): string {
  if (!result.success && result.error) {
    return `Sync failed: ${result.error}`
  }

  const { totalProcessed, totalErrors, processingTime, sources } = result

  let message = `Processed ${totalProcessed} bookings`
  
  if (totalErrors > 0) {
    message += ` with ${totalErrors} errors`
  }
  
  message += ` in ${processingTime}ms`

  if (sources.length > 0) {
    message += '\n\nSources:'
    sources.forEach(source => {
      message += `\n• ${source.name}: ${source.bookingsProcessed} bookings`
      if (source.errors.length > 0) {
        message += ` (${source.errors.length} errors)`
      }
    })
  }

  return message
}

/**
 * Get platform-specific sync instructions
 */
export function getPlatformInstructions(platform: string): string {
  switch (platform) {
    case 'airbnb':
      return 'Go to Your Account → Calendar → Export Calendar → Copy ICS URL'
    case 'vrbo':
      return 'Property Dashboard → Calendar → Calendar Sync → Export Calendar URL'
    case 'booking':
      return 'Extranet → Property → Calendar → Sync Calendars → Export URL'
    default:
      return 'Refer to your platform\'s calendar export documentation'
  }
}

/**
 * Validate ICS URL format
 */
export function validateIcsUrl(url: string): { valid: boolean; error?: string } {
  try {
    const urlObj = new URL(url)
    
    // Must be HTTPS
    if (urlObj.protocol !== 'https:') {
      return { valid: false, error: 'URL must use HTTPS' }
    }

    // Should end with .ics
    if (!urlObj.pathname.endsWith('.ics')) {
      return { valid: false, error: 'URL should end with .ics' }
    }

    return { valid: true }

  } catch (error) {
    return { valid: false, error: 'Invalid URL format' }
  }
}